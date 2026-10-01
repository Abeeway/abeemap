import { MqttClient } from 'mqtt';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../auth/auth.service';
import { MqttClientService, MqttConnector } from './mqtt-client.service';

function fakeClient() {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  const client = jasmine.createSpyObj<MqttClient>('MqttClient', ['on', 'subscribe', 'unsubscribe', 'end']);
  client.on.and.callFake((event, listener) => {
    listeners.set(event, listener as unknown as (...args: unknown[]) => void);
    return client;
  });
  return { client, emit: (event: string, ...args: unknown[]) => listeners.get(event)?.(...args) };
}

describe('MQTT connection lifecycle', () => {
  let service: MqttClientService;
  let connect: jasmine.Spy<MqttConnector>;
  let first: ReturnType<typeof fakeClient>;
  let auth: AuthService;

  beforeEach(() => {
    jasmine.clock().install();
    spyOn(console, 'log');
    first = fakeClient();
    connect = jasmine.createSpy<MqttConnector>('mqttConnect').and.returnValue(first.client);
    auth = { platform: 'PREVDX', mqttUserName: 'user', mqttPassword: 'key', mqttTopic: 'test/topic/#' } as AuthService;
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    service = new MqttClientService(auth, snackBar, connect);
  });

  afterEach(() => {
    try {
      service?.ngOnDestroy();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  function start() {
    service.connect();
    jasmine.clock().tick(1000);
  }

  function subscribeAck(client = first.client, error?: Error) {
    const callback = client.subscribe.calls.mostRecent().args[1] as (error?: Error) => void;
    callback(error);
  }

  it('cancels the delayed connection before a client is created', () => {
    service.connect();
    expect(service.connectionActive).toBeTrue();
    service.disconnect();
    jasmine.clock().tick(1000);
    expect(connect).not.toHaveBeenCalled();
    expect(service.connectionActive).toBeFalse();
    expect(service.connected$.getValue()).toBeFalse();
  });

  it('terminates a connecting client and ignores its late connect event', () => {
    start();
    service.disconnect();
    expect(first.client.end).toHaveBeenCalledOnceWith(true);
    first.emit('connect');
    expect(service.connected$.getValue()).toBeFalse();
    expect(first.client.subscribe).not.toHaveBeenCalled();
    expect(service.client).toBeUndefined();
  });

  it('coalesces repeated connect requests into one pending attempt', () => {
    service.connect();
    jasmine.clock().tick(500);
    service.connect();
    jasmine.clock().tick(500);
    expect(connect).not.toHaveBeenCalled();
    jasmine.clock().tick(500);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('resubscribes after transport loss with automatic retry enabled', () => {
    start();
    expect(connect.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({ reconnectPeriod: 5000, resubscribe: false, reconnectOnConnackError: false }));
    first.emit('connect');
    subscribeAck();
    expect(service.subscribed).toBeTrue();
    first.emit('close');
    expect(service.connected$.getValue()).toBeFalse();
    expect(service.subscribed).toBeFalse();
    expect(service.connectionActive).toBeTrue();
    first.emit('connect');
    expect(first.client.subscribe).toHaveBeenCalledTimes(2);
    subscribeAck();
    expect(service.subscribed).toBeTrue();
    expect(service.connected$.getValue()).toBeTrue();
  });

  it('keeps transport errors eligible for retry but stops on authentication refusal', () => {
    start();
    first.emit('error', new Error('WebSocket unavailable'));
    expect(first.client.end).not.toHaveBeenCalled();
    first.emit('error', Object.assign(new Error('Not authorized'), { code: 5 }));
    expect(first.client.end).toHaveBeenCalledOnceWith(true);
    expect(service.connectionActive).toBeFalse();
  });

  it('ignores old client events and acknowledgements after replacement', () => {
    start();
    first.emit('connect');
    const message = jasmine.createSpy('message');
    service.message$.subscribe(message);
    const second = fakeClient();
    connect.and.returnValue(second.client);
    service.connect();
    expect(first.client.end).toHaveBeenCalledOnceWith(true);
    jasmine.clock().tick(1000);
    second.emit('connect');
    subscribeAck(second.client);
    first.emit('close');
    first.emit('connect');
    first.emit('error', new Error('old failure'));
    first.emit('message', 'topic', '{"coordinates":[0,0]}');
    subscribeAck(first.client, new Error('old subscription failure'));
    expect(service.client).toBe(second.client);
    expect(service.connected$.getValue()).toBeTrue();
    expect(service.subscribed).toBeTrue();
    expect(message).not.toHaveBeenCalled();
  });

  it('ignores acknowledgements from an earlier connection on the same client', () => {
    start();
    first.emit('connect');
    const oldAck = first.client.subscribe.calls.mostRecent().args[1] as (error?: Error) => void;
    first.emit('close');
    first.emit('connect');
    subscribeAck();
    oldAck(new Error('stale failure'));
    expect(service.subscribed).toBeTrue();
  });

  it('can disconnect repeatedly and manually reconnect', () => {
    start();
    first.emit('connect');
    subscribeAck();
    service.disconnect();
    service.disconnect();
    expect(first.client.end).toHaveBeenCalledTimes(1);
    start();
    first.emit('connect');
    expect(service.connected$.getValue()).toBeTrue();
  });

  it('cancels a pending connection on service destruction', () => {
    service.connect();
    service.ngOnDestroy();
    jasmine.clock().tick(1000);
    expect(connect).not.toHaveBeenCalled();
  });

  it('cleans up a live client on service destruction', () => {
    start();
    service.ngOnDestroy();
    expect(first.client.end).toHaveBeenCalledOnceWith(true);
    expect(service.connectionActive).toBeFalse();
  });

  it('resets a previous connection if the replacement has missing credentials', () => {
    start();
    first.emit('connect');
    auth.mqttPassword = null;
    service.connect();
    jasmine.clock().tick(1000);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(first.client.end).toHaveBeenCalledTimes(1);
    expect(service.connectionActive).toBeFalse();
    expect(service.connected$.getValue()).toBeFalse();
  });
});
