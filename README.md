# Notify - Listen

Listen to Notify server action and perform client side action.

Trigger a microflow or nanoflow directly from the server on the client app, triggered from other session, whiteout waiting for the users interact with the page.

Use cases
 - Asynchronous refreshes
 - Notification
 - Chat function

In the standard situation updates in the client are trigger by user interaction, by timed actions or Data grid refresh time. In case information, that is not created by the same user session, that needs be updated immediately in the client app, no viable option is supported in the Mendix core product. As alternative users need to refresh their page constantly by timers or by constant clicking. This is not user friendly and is not preferment when scaling.

With this module can create a Notify event on the server that directly cause an action in the client application.

The event is based on a persistable object that is available in the server and the client page. From a microflow the `Notify` action will send a message to every `Listen` widget that is listen to the same object and `Action name`.

Please not the Listen widget can only listen when the page is active. So the widget can not be used to send notification when user are navigated away.

## Dependencies
 - Mendix 7.14
 - External service Pusher.com

## Dependent external service

This module is build around the pusher.com/channels product. https://pusher.com/channels.
Pusher.com is payed service, however there is very generous free tree sandbox plan.
https://pusher.com/channels/pricing

At the moment, 28 September 2018

| Plan | Sandbox |
| --- | --- |
| Price | Free |
| Connections | 100 Max |
| Number of channels | Unlimited |
| Messages | 200k / Day |
| Support | Limited |
| Protection | SSL |

### Setup app

1. Sign up at https://pusher.com
1. From the dashboard, create an app
1. On the overview page of the app the keys are shown
1. Copy keys: app_id, key, secret, cluster into the `NotifyListen` module constants

## Usage

1. Import the module from the app store
1. Add the module role `NotifyListen User` to the user role
1. Update the constants in the Configuration folder with the keys of the app
1. Create a microflow to execute the `Notify` action. With input parameters
    1. Key settings
    1. `Action name`, same as configured in the widget
    1. The context object of the widget
1. Place the widget in the page within a data view, the context should match the parameter object
1. Set the key and cluster in the tab general
1. In the `Action list` add an action
    1. The `Action name` should match the action name parameter provided in the `Notify` action.
    1. Select a microflow or nanoflow the execute the action

## Demo sequence diagram

![Update object via Notify - Listen](/assets/SequenceDiagramUpdateObject.png)

## Refresh microflow

A microflow can be used to retrieve data that is changed by other users as long is it committed and the transaction has finished.

The `$Message` variable is containing the object in session state, and the with the XPath query `[id = $Message]` the object is retried from the database. The changes action does only do a `Refresh in client`. This will trigger an refresh update on the client page.

![Update object via Notify - Listen](/assets/RefreshMicroflowSample.png)

## Security

The notify messages are send and anybody who listing.
A message will contain limited data: entity name, id, changed date, notifier username. To send a 'Notify' message it is requires to have the private key which is stored on the server in the `NotifyListen.secret` constant. This 'secret' should not shared with anybody. The 'Listen' widget will user the public `NotifyListen.key` to receive a signal and will perform the action as the logged in user.

An addition authentication request is made to the Mendix rest server `<host>/rest/notifylisten/auth`. Only when success full the user is allowed to lists. The service will only allow logged in user with the module right `NotifyListen.User` to listen, if the user have entity access to the object of the data where the widget is placed in.
