import * as dojoDeclare from "dojo/_base/declare";
import * as WidgetBase from "mxui/widget/_WidgetBase";
import * as domConstruct from "dojo/dom-construct";

import * as Pusher from "pusher-js";

interface RefreshData {
    changedDate: string;
    guid: string;
    entity: string;
}

interface Nanoflow {
    nanoflow: object[];
    paramsSpec: { Progress: string };
}

type ActionOptions = "showPage" | "callNanoflow" | "callMicroflow";

type PageLocation = "content"| "popup" | "modal";

class RemoteAction extends WidgetBase {
    // Modeler settings - General
    cluster: string;
    key: string;
    // Modeler settings - Action
    actionName: string;
    action: ActionOptions;
    page: string;
    openPageAs: PageLocation;
    microflow: string;
    nanoflow: Nanoflow;

    private pusher: Pusher.Pusher;
    private channelName: string;

    postCreate() {
        logger.debug(this.friendlyId + ".postCreate");
        const message = this.validateSettings();
        if (!message) {
            this.pusher = new Pusher(this.key, {
                cluster: this.cluster,
                encrypted: true
            });
            this.pusher.connection.bind("error", error => {
                logger.error(this.friendlyId, "Error Pusher js connection", error);
            });
            this.pusher.connection.bind("state_change", states => {
                logger.debug(this.friendlyId, "current state is " + states.current);
            });
        } else {
            this.showError(message);
        }
    }

    update(contextObject: mendix.lib.MxObject, callback?: () => void) {
        logger.debug(this.friendlyId + ".update");

        this.subscribeChannel(contextObject);

        if (callback) {
            callback();
        }
    }

    uninitialize(): boolean {
        logger.debug(this.friendlyId + ".uninitialize");
        if (this.pusher) {
            this.pusher.disconnect();
        }
        return true;
    }

    private validateSettings(): string | undefined {
        if (this.action === "showPage" && !this.page) {
            return "Action is set to Show a page, but no Page is select";
        }
        if (this.action === "callMicroflow" && !this.microflow) {
            return "Action is set to Call a microflow but no Microflow is select";
        }
        if (this.action === "callNanoflow" && !this.nanoflow.nanoflow) {
            return "Action is set to Call a nanoflow but no Nanoflow is select";
        }
        return;
    }

    private subscribeChannel(object: mendix.lib.MxObject) {
        if (object) {
            const newChannelName = object.getEntity() + "." + object.getGuid();
            if (newChannelName !== this.channelName) {
                if (this.channelName) {
                    this.pusher.unsubscribe(this.channelName);
                }
                this.channelName = newChannelName;
                window.logger.debug(this.friendlyId + ".subscribeChannel", this.channelName);
                const channel = this.pusher.subscribe(this.channelName);
                channel.bind(this.actionName, (data: RefreshData) => {
                    if (this.action === "showPage") {
                        this.showPage();
                    } else if (this.action === "callMicroflow") {
                        this.callMicroflow();
                    } else if (this.action === "callNanoflow") {
                        this.callNanoflow();
                    } else {
                        window.logger.error("Unknown action", this.action);
                    }
                });
            }
        } else if (this.channelName) {
            this.pusher.unsubscribe(this.channelName);
            this.channelName = "";
        }
    }

    showPage() {
        window.mx.ui.openForm(this.page, {
            context: this.mxcontext,
            location: this.openPageAs,
            error: error =>
                window.mx.ui.error(`An error occurred while opening form ${this.page} : ${error.message}`)
        });
    }

    callNanoflow() {
        window.mx.data.callNanoflow({
            nanoflow: this.nanoflow,
            origin: this.mxform,
            context: this.mxcontext,
            callback: () => {
                window.logger.debug("callNanoflow done");
            },
            error: error => {
                window.mx.ui.error("Error calling nanoflow");
                window.logger.error("Error calling nanoflow", error);
            }
        });
    }

    callMicroflow() {
        window.mx.data.action({
            params: {
                actionname: this.microflow
            },
            origin: this.mxform,
            context: this.mxcontext,
            callback: () => {
                window.logger.debug("callMicroflow done");
            },
            error: error => {
                window.mx.ui.error("Error calling microflow");
                window.logger.error("error calling microflow", error);
            }
        });
    }

    private showError(message: string) {
        domConstruct.place(`<div class='alert alert-danger'>${message}</div>`, this.domNode, "first");
        window.logger.error(this.friendlyId, message);
    }
}

// Declare widget prototype the Dojo way
// Thanks to https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/dojo/README.md
// tslint:disable : only-arrow-functions
dojoDeclare("RemoteAction.widget.RemoteAction", [ WidgetBase ], function(Source: any) {
    const result: any = {};
    for (const property in Source.prototype) {
        if (property !== "constructor" && Source.prototype.hasOwnProperty(property)) {
            result[property] = Source.prototype[property];
        }
    }
    return result;
}(RemoteAction));
