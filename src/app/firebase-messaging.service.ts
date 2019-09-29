import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import * as app from 'firebase/app';
import { Firebase } from '@ionic-native/firebase/ngx';
import { Device } from '@ionic-native/device/ngx';

@Injectable({
  providedIn: 'root'
})
export class FirebaseMessagingService {

  public currentToken: string;
  private messaging;
  private unsubscribeOnTokenRefresh = () => {};

  constructor(
    private storage: Storage,
    private firebaseCordova: Firebase,
    private device: Device,
  ) {
    if (this.device.platform === 'Android' || this.device.platform === 'ios') {
      this.firebaseCordovaInit();
    } else {
      this.messaging = app.messaging();
      navigator.serviceWorker.register('firebase-messaging-sw.js').then((registration) => {
        this.messaging.useServiceWorker(registration);
        // this.disableNotifications()
        this.enableNotifications();
      });
    }
  }

  public firebaseCordovaInit() {
    this.firebaseCordova.getToken()
      .then(token => {
        this.currentToken = token;
        console.log(`The token is ${token}`);
      }) // save the token server-side and use it to push notifications to this device
      .catch(error => console.error('Error getting token', error));

    this.firebaseCordova.onNotificationOpen()
      .subscribe(data => console.log(`User opened a notification ${data}`));

    this.firebaseCordova.onTokenRefresh().subscribe((token: string) => console.log(`Got a new token ${token}`));
  }

  public enableNotifications() {
    console.log('Requesting permission...');
    return this.messaging.requestPermission().then(() => {
        console.log('Permission granted');
        // token might change - we need to listen for changes to it and update it
        this.setupOnTokenRefresh();
        return this.updateToken();
      });
  }

  public disableNotifications() {
    this.unsubscribeOnTokenRefresh();
    this.unsubscribeOnTokenRefresh = () => {};
    return this.storage.set('fcmToken', '').then();
  }

  private updateToken() {
    return this.messaging.getToken().then((currentToken) => {
      if (currentToken) {
        // we've got the token from Firebase, now let's store it in the database
        console.log(currentToken);
        this.currentToken = currentToken;
        return this.storage.set('fcmToken', currentToken);
      } else {
        console.log('No Instance ID token available. Request permission to generate one.');
      }
    });
  }

  private setupOnTokenRefresh(): void {
    this.unsubscribeOnTokenRefresh = this.messaging.onTokenRefresh(() => {
      console.log('Token refreshed');
      this.storage.set('fcmToken', '').then(() => { this.updateToken(); });
    });
  }
}
