import * as dojoDeclare from "dojo/_base/declare";
import * as WidgetBase from "mxui/widget/_WidgetBase";
import * as domConstruct from "dojo/dom-construct";

import * as Pusher from "pusher-js";

interface MessageData {
    guid: string;
    entity: string;
    changedDate: number;
    sender: string;
}

interface Action {
    actionName: string;
    action: ActionOptions;
    microflow: string;
    nanoflow: mx.Nanoflow;
}

type ActionOptions = "callNanoflow" | "callMicroflow";

class NotifyListen extends WidgetBase {
    // Modeler settings - General
    cluster: string;
    key: string;
    // Modeler settings - Action
    actionList: Action[];

    private pusher: Pusher.Pusher;
    private channelName: string;

    postCreate() {
        window.logger.debug(this.friendlyId + ".postCreate");
        const message = this.validateSettings();
        if (!message) {
            this.pusher = new Pusher(this.key, {
                cluster: this.cluster,
                encrypted: true,
                authEndpoint: "/rest/notifylisten/auth",
                auth: {
                    headers: {
                        "X-Csrf-Token": mx.session.getConfig("csrftoken")
                    }
                }
            });
            this.pusher.connection.bind("error", error => {
                window.logger.error(this.friendlyId, "Error Pusher js connection", error);
            });
            this.pusher.connection.bind("state_change", states => {
                window.logger.debug(this.friendlyId, "current state is " + states.current);
            });
        } else {
            this.showError(message);
        }
    }

    update(contextObject: mendix.lib.MxObject, callback?: () => void) {
        window.logger.debug(this.friendlyId + ".update");
        if (this.pusher) {
            this.subscribeChannel(contextObject);
        }

        if (callback) {
            callback();
        }
    }

    uninitialize(): boolean {
        window.logger.debug(this.friendlyId + ".uninitialize");
        if (this.pusher) {
            this.pusher.disconnect();
        }
        return true;
    }

    private validateSettings(): string | undefined {
        const errorList: string[] = [];
        this.actionList.forEach(action => {
            if (action.action === "callMicroflow" && !action.microflow) {
                errorList.push(`Action ${action.actionName} is set to Call a microflow but no Microflow is selected`);
            }
            if (action.action === "callNanoflow" && !action.nanoflow.nanoflow) {
                errorList.push(`Action ${action.actionName} is set to Call a nanoflow but no Nanoflow is selected`);
            }
        });
        if (errorList.length > 0) {
            return errorList.join("<br>\n");
        }
        return;
    }

    private subscribeChannel(object: mendix.lib.MxObject) {
        if (object) {
            const newChannelName = "private-" + object.getEntity() + "." + object.getGuid();
            if (newChannelName !== this.channelName) {
                if (this.channelName) {
                    this.pusher.unsubscribe(this.channelName);
                }
                this.channelName = newChannelName;
                window.logger.debug(this.friendlyId + ".subscribeChannel", this.channelName);
                const channel = this.pusher.subscribe(this.channelName);
                this.actionList.forEach(action => {
                    channel.bind(action.actionName, (data: MessageData) => {
                        window.logger.debug(this.friendlyId + " received data ", data);
                        if (action.action === "callMicroflow") {
                            this.callMicroflow(action.microflow);
                        } else if (action.action === "callNanoflow") {
                            this.callNanoflow(action.nanoflow);
                        } else {
                            window.logger.warn("Unknown action", action.action);
                        }
                    });
                    channel.bind("pusher:subscription_error", error => {
                        window.logger.error(this.friendlyId, "subscription_error", error);
                    });
                });
            }
        } else if (this.channelName) {
            this.pusher.unsubscribe(this.channelName);
            this.channelName = "";
        }
    }

    private callNanoflow(nanoflow: mx.Nanoflow) {
        window.mx.data.callNanoflow({
            nanoflow,
            origin: this.mxform,
            context: this.mxcontext,
            error: error => {
                window.mx.ui.error(`An error occurred while executing the nanoflow: ${error.message}`);
                window.logger.error(this.friendlyId + " An error occurred while executing a nanoflow:", error);
            }
        });
    }

    private callMicroflow(actionname: string) {
        window.mx.data.action({
            params: { actionname },
            origin: this.mxform,
            context: this.mxcontext,
            error: error => window.mx.ui.error(`Error while executing microflow ${actionname}: ${error.message}`)
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
dojoDeclare("NotifyListen.widget.NotifyListen", [ WidgetBase ], function(Source: any) {
    const result: any = {};
    for (const property in Source.prototype) {
        if (property !== "constructor" && Source.prototype.hasOwnProperty(property)) {
            result[property] = Source.prototype[property];
        }
    }
    return result;
}(NotifyListen));
