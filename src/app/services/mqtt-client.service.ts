import { Injectable, OnInit } from '@angular/core';
import mqtt, { MqttClient } from 'mqtt';
import { Subject, BehaviorSubject } from 'rxjs';

import { AuthService } from '../auth/auth.service';

import { CONFIG } from '../../environments/environment';

import { MatSnackBar} from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class MqttClientService implements OnInit {

  client?: MqttClient;
  private connectTimer?: ReturnType<typeof setTimeout>;
  //connected = false;
  subscribed = false;

  connected$ = new BehaviorSubject(false);

  message$ = new Subject<any>();
  // message$ = new ReplaySubject<any>(5);
  locationUpdateMessage$ = new Subject<any>();

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
  ) { }

  ngOnInit(): void {
    this.connect();
  }

  connect(): void {
    clearTimeout(this.connectTimer);
    this.connectTimer = setTimeout(() => {
      const mqttUserName = this.authService.mqttUserName;
      const mqttPassword = this.authService.mqttPassword;
      const mqttTopic = this.authService.mqttTopic;

      if ( !(mqttUserName && mqttPassword && mqttTopic) ) {
        console.log(`MQTT CONNECTION FAILURE: No proper MQTT params are cached in localStorage yet!`);
        this.reportError(`CONNECTION FAILURE: No API Key has been provided!`);
        return;
      }

      const platformConfig = CONFIG[this.authService.platform];
      const brokerUrl = `${platformConfig.MQTT_WS_PROTOCOL}://${platformConfig.MQTT_WS_BROKER}:${platformConfig.MQTT_WS_PORT}/${platformConfig.MQTT_WS_PATH}`;

      if (this.client) {
        this.client.removeAllListeners();
        this.client.end(true);
      }

      const client = mqtt.connect(brokerUrl, {
        clientId: platformConfig.MQTT_CLIENT_ID_PREFIX + Math.floor(Math.random() * 1000000),
        username: mqttUserName,
        password: mqttPassword,
        keepalive: 30,
        reconnectPeriod: 0,
        clean: true,
      });

      this.client = client;

      client.once('connect', () => {
        if (this.client !== client) {
          return;
        }
        this.connected$.next(true);
        console.log('MQTT CLIENT CONNECTED');
        this.reportEvent('MQTT Client Connected to Broker');
        this.subscribe();
      });

      client.on('message', (_topic, payload) => {
        this.processMessage(payload.toString());
      });

      client.on('close', () => {
        if (this.client !== client) {
          return;
        }
        this.connected$.next(false);
        this.subscribed = false;
      });

      client.on('error', (error) => {
        if (this.client !== client) {
          return;
        }
        console.log(`MQTT CONNECTION FAILURE: ${error.message}`);
        this.reportError(`MQTT Client Couldn't connect to Broker: ${error.message}`);
        client.end(true);
      });
    }, 1000);
  }

  processMessage(payload: string): void {
    try {
      const msg = JSON.parse(payload);

      delete msg.processedFeed;
      delete msg.rawPosition;
      delete msg.resolvedTracker;
      this.message$.next(msg);

      if (msg.coordinates && msg.coordinates[0] && msg.coordinates[1]) {
        this.locationUpdateMessage$.next(msg);
      }
    } catch (err: any) {
      console.log(err.message);
    }
  }

  disconnect(): void {
    // if (!this.connected) {
    if (!this.connected$.getValue()) {
      console.log('DISCONNECTION FAILURE: You are not connected to the server!');
      return;
    }
    this.client?.end();
    // this.connected = false;
    this.connected$.next(false);
    this.subscribed = false;
    this.reportEvent(`MQTT Client Disconnected from Broker`);
  }

  subscribe(): void {
    // if (!this.connected) {
    if (!this.connected$.getValue()) {
      console.log('SUBSCRIPTION FAILURE: You are not connected to the server!');
      return;
    }
    
    const mqttTopic = this.authService.mqttTopic;

    if (!mqttTopic || !this.client) {
      console.log('SUBSCRIPTION FAILURE: No MQTT topic is configured!');
      return;
    }

    console.log(`****************** TOPIC ********************`);
    console.log(mqttTopic);
    console.log(`****************** TOPIC ********************`);

    this.client.subscribe(mqttTopic, (error) => {
      this.subscribed = !error;
      if (error) {
        console.log(`SUBSCRIPTION FAILURE: ${error.message}`);
      }
    });
  }

  unsubscribe(): void {
    // if (!this.connected) {
    if (!this.connected$.getValue()) {
      console.log('UNSUBSCRIPTION FAILURE: You are not connected to the server!');
      return;
    }
    if (!this.subscribed) {
      console.log('UNSUBSCRIPTION FAILURE: You are not subscribed!');
      return;
    }

    const mqttTopic = this.authService.mqttTopic;

    if (!mqttTopic || !this.client) {
      console.log('UNSUBSCRIPTION FAILURE: No MQTT topic is configured!');
      return;
    }

    this.client.unsubscribe(mqttTopic, (error) => {
      if (error) {
        console.log(`UNSUBSCRIPTION FAILURE: ${error.message}`);
      } else {
        this.subscribed = false;
      }
    });
  }

  reportEvent(event:string) {
    this.snackBar.open(event, 'OK', {
      panelClass: ['green-snackbar'],
      duration: 3000,
    });
  }

  reportError(error:string) {
    this.snackBar.open(
      'MQTT EVENT: ' + JSON.stringify(error), 
      'x', 
      { panelClass: ['red-snackbar'] }
    );       
  }

}
