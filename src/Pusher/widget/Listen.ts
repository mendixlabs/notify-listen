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

interface KeyData {
    key: string;
    cluster: string;
}

type ActionOptions = "callNanoflow" | "callMicroflow";

class NotifyListen extends WidgetBase {
    // Modeler settings - Action
    actionList: Action[];

    private pusher: Pusher.Pusher;
    private channelName: string;

    postCreate() {
        window.logger.debug(this.friendlyId + ".postCreate");
        const message = this.validateSettings();
        if (!message) {
            this.getKey().then(keyData => {
                const baseUrl = window.dojoConfig.remotebase ? window.dojoConfig.remotebase : mx.appUrl;
                if (!keyData.key || !keyData.cluster) {
                    this.showError("Authentication key and cluster are required. Please make sure Pusher.Pusher_Key and Pusher.Pusher_Cluster constants are set.");
                    return;
                }
                if ([ "eu", "mt1", "us2", "ap1", "ap2" ]. indexOf(keyData.cluster) === -1) {
                    this.showError(`Authentication cluster "${keyData.cluster}" is not supported. Please make sure  Pusher.Pusher_Cluster constants are set to "eu", "mt1", "us2", "ap1" or "ap2"`);
                    return;
                }
                this.pusher = new Pusher(keyData.key, {
                    cluster: keyData.cluster,
                    encrypted: true,
                    authEndpoint: baseUrl + "rest/pusher/auth",
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
            }).then(() => {
                window.logger.debug(this.friendlyId + ".postCreate after pusher");
                const contextObject = this.mxcontext.getTrackObject();
                if (contextObject) {
                    this.subscribeChannel(contextObject);
                }
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

    private getKey(): Promise<KeyData> {
        const baseUrl = window.dojoConfig.remotebase ? window.dojoConfig.remotebase : mx.appUrl;
        console.log("Request auth " + baseUrl + "rest/pusher/key");
        const request = new Request(baseUrl + "rest/pusher/key", {
            method: "get",
            credentials: "same-origin",
            headers: {
                "X-Csrf-Token": mx.session.getConfig("csrftoken")
            }
        });
        return fetch(request)
            .then(response => {
                const { status } = response;
                if (status === 200) {
                    return response.text();
                } else {
                    logger.warn("Couldn't get key data from your web app", status);
                    throw status;
                }
            })
            .then(data => {
                try {
                    return JSON.parse(data);
                } catch (error) {
                    const message = "JSON returned from web app key request is invalid, yet status code was 200. Data was: " + data;
                    logger.warn(message);
                    throw message;
                }
            });
    }

    private subscribeChannel(object: mendix.lib.MxObject) {
        window.logger.debug(this.friendlyId + ".subscribeChannel");
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
                        if (error === 515) {
                            this.showError("Authentication key, secret, app ID and cluster are required. Please make sure Pusher.Pusher_Key, Pusher.Pusher_Cluster, Pusher.Pusher_App_ID and Pusher.Pusher_Secret constants are set.");
                            return;
                        }
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
        domConstruct.place(`<div class='alert alert-danger'>Pusher Listen: ${message}</div>`, this.domNode, "first");
        window.logger.error(this.friendlyId, message);
    }
}

// Declare widget prototype the Dojo way
// Thanks to https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/dojo/README.md
// tslint:disable : only-arrow-functions
dojoDeclare("Pusher.widget.Listen", [ WidgetBase ], function(Source: any) {
    const result: any = {};
    for (const property in Source.prototype) {
        if (property !== "constructor" && Source.prototype.hasOwnProperty(property)) {
            result[property] = Source.prototype[property];
        }
    }
    return result;
}(NotifyListen));
