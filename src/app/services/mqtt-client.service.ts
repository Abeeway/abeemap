import { Inject, Injectable, InjectionToken, OnInit, OnDestroy } from '@angular/core';
import mqtt, { IClientOptions, MqttClient } from 'mqtt';
import { Subject, BehaviorSubject } from 'rxjs';

import { AuthService } from '../auth/auth.service';

import { CONFIG } from '../../environments/environment';

import { MatSnackBar} from '@angular/material/snack-bar';

export type MqttConnector = (brokerUrl: string, options: IClientOptions) => MqttClient;

export const MQTT_CONNECT = new InjectionToken<MqttConnector>('MQTT_CONNECT', {
  providedIn: 'root',
  factory: () => mqtt.connect,
});

@Injectable({
  providedIn: 'root'
})
export class MqttClientService implements OnInit, OnDestroy {

  client?: MqttClient;
  private connectTimer?: ReturnType<typeof setTimeout>;
  private connectionEpoch = 0;
  //connected = false;
  subscribed = false;

  connected$ = new BehaviorSubject(false);

  message$ = new Subject<any>();
  // message$ = new ReplaySubject<any>(5);
  locationUpdateMessage$ = new Subject<any>();

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
    @Inject(MQTT_CONNECT) private connectClient: MqttConnector = mqtt.connect,
  ) { }

  ngOnInit(): void {
    this.connect();
  }

  connect(): void {
    this.stopConnection();
    this.connectTimer = setTimeout(() => {
      this.connectTimer = undefined;
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

      const client = this.connectClient(brokerUrl, {
        clientId: platformConfig.MQTT_CLIENT_ID_PREFIX + Math.floor(Math.random() * 1000000),
        username: mqttUserName,
        password: mqttPassword,
        keepalive: 30,
        // Retry transport interruptions every five seconds. Subscribe explicitly
        // on each connection; authentication refusals require user intervention.
        reconnectPeriod: 5000,
        reconnectOnConnackError: false,
        resubscribe: false,
        clean: true,
      });

      this.client = client;

      client.on('connect', () => {
        if (this.client !== client) {
          return;
        }
        this.connectionEpoch++;
        this.subscribed = false;
        this.connected$.next(true);
        console.log('MQTT CLIENT CONNECTED');
        this.reportEvent('MQTT Client Connected to Broker');
        this.subscribe();
      });

      client.on('message', (_topic, payload) => {
        if (this.client !== client || !this.connected$.getValue()) return;
        this.processMessage(payload.toString());
      });

      client.on('close', () => {
        if (this.client !== client) {
          return;
        }
        this.connectionEpoch++;
        this.connected$.next(false);
        this.subscribed = false;
      });

      client.on('error', (error) => {
        if (this.client !== client) {
          return;
        }
        console.log(`MQTT CONNECTION FAILURE: ${error.message}`);
        this.reportError(`MQTT Client Couldn't connect to Broker: ${error.message}`);
        const code = (error as Error & { code?: number }).code;
        if (code === 4 || code === 5 || code === 134 || code === 135) {
          this.stopConnection();
        }
      });
    }, 1000);
  }

  processMessage(payload: string): void {
    try {
      const msg = JSON.parse(payload);

      delete msg.processedFeed;
      delete msg.rawPosition;
      delete msg.resolvedTracker;

      
      // DEBUGGING: Uncomment the following line to log all incoming messages to the console
      // console.log(msg);


      this.message$.next(msg);

      if (this.hasValidCoordinates(msg.coordinates)) {
        this.locationUpdateMessage$.next(msg);
      }
    } catch (err: any) {
      console.log(err.message);
    }
  }

  private hasValidCoordinates(coordinates: unknown): boolean {
    if (!Array.isArray(coordinates) || coordinates.length < 2) return false;
    const [longitude, latitude] = coordinates;
    return typeof longitude === 'number' && Number.isFinite(longitude)
      && longitude >= -180 && longitude <= 180
      && typeof latitude === 'number' && Number.isFinite(latitude)
      && latitude >= -90 && latitude <= 90;
  }

  disconnect(): void {
    const wasActive = this.connectionActive;
    this.stopConnection();
    if (wasActive) this.reportEvent('MQTT Client Disconnected from Broker');
  }

  get connectionActive(): boolean {
    return this.connectTimer !== undefined || this.client !== undefined;
  }

  private stopConnection(): void {
    clearTimeout(this.connectTimer);
    this.connectTimer = undefined;
    const client = this.client;
    this.client = undefined;
    this.connectionEpoch++;
    this.connected$.next(false);
    this.subscribed = false;
    // End even a client still connecting or waiting for a reconnect. Its late
    // events are ignored by identity/epoch checks, including during shutdown.
    client?.end(true);
  }

  ngOnDestroy(): void {
    this.stopConnection();
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

    const client = this.client;
    const epoch = this.connectionEpoch;
    client.subscribe(mqttTopic, (error) => {
      if (this.client !== client || this.connectionEpoch !== epoch) return;
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

    const client = this.client;
    const epoch = this.connectionEpoch;
    client.unsubscribe(mqttTopic, (error) => {
      if (this.client !== client || this.connectionEpoch !== epoch) return;
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
