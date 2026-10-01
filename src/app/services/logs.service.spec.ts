import { Subject } from 'rxjs';

import { LogMessage, LogsService } from './logs.service';
import { MqttClientService } from './mqtt-client.service';

describe('bounded message logs', () => {
  let messages: Subject<unknown>;
  let service: LogsService;

  beforeEach(() => {
    messages = new Subject<unknown>();
    service = new LogsService({ message$: messages } as unknown as MqttClientService);
  });

  afterEach(() => service.ngOnDestroy());

  it('starts with an empty collection suitable for the table', () => {
    const received = jasmine.createSpy('logs');
    const subscription = service.locationUpdateLogs$.subscribe(received);
    expect(received).toHaveBeenCalledOnceWith([]);
    expect(service.locationUpdateLogs).toEqual([]);
    subscription.unsubscribe();
  });

  it('retains only the newest 500 messages after sustained traffic', () => {
    service.ngOnInit();
    let maximumRetained = 0;
    const subscription = service.locationUpdateLogs$.subscribe((logs) => {
      maximumRetained = Math.max(maximumRetained, logs.length);
    });
    for (let id = 1; id <= 1500; id++) messages.next({ id });

    expect(maximumRetained).toBe(500);
    expect(service.locationUpdateLogs.length).toBe(500);
    expect(service.locationUpdateLogs.map((message) => message['id']))
      .toEqual(Array.from({ length: 500 }, (_, index) => 1500 - index));
    expect(service.locationUpdateLogs[0].counter).toBe(1500);
    expect(service.locationUpdateLogs[499].counter).toBe(1001);
    expect(service.counter).toBe(1500);
    subscription.unsubscribe();
  });

  it('keeps exactly 500 entries before and after the first eviction', () => {
    service.ngOnInit();
    for (let id = 1; id <= 500; id++) messages.next({ id });
    expect(service.locationUpdateLogs.length).toBe(500);
    expect(service.locationUpdateLogs[499]['id']).toBe(1);
    messages.next({ id: 501 });
    expect(service.locationUpdateLogs.length).toBe(500);
    expect(service.locationUpdateLogs[0]['id']).toBe(501);
    expect(service.locationUpdateLogs[499]['id']).toBe(2);
  });

  it('does not mutate shared messages or previously published snapshots', () => {
    service.ngOnInit();
    const message = Object.freeze({ deviceEUI: '0011223344556677', counter: 99 });
    messages.next(message);
    const first: readonly LogMessage[] = service.locationUpdateLogs;
    messages.next({ deviceEUI: '0011223344556678' });
    expect(message.counter).toBe(99);
    expect(first.length).toBe(1);
    expect(first[0].counter).toBe(1);
    expect(service.locationUpdateLogs.length).toBe(2);
    expect(service.locationUpdateLogs[0].counter).toBe(2);
  });

  it('initializes only one subscription even when called repeatedly', () => {
    service.ngOnInit();
    service.ngOnInit();
    messages.next({ id: 1 });
    expect(service.counter).toBe(1);
    expect(service.locationUpdateLogs.length).toBe(1);
  });

  it('stops retaining messages when the service is destroyed', () => {
    service.ngOnInit();
    messages.next({ id: 1 });
    service.ngOnDestroy();
    messages.next({ id: 2 });
    expect(service.counter).toBe(1);
    expect(service.locationUpdateLogs.length).toBe(1);
  });

  it('ignores non-object messages and continues recording valid messages', () => {
    service.ngOnInit();
    for (const message of [null, undefined, 'text', 1, true, []]) messages.next(message);
    messages.next({ id: 1 });
    expect(service.counter).toBe(1);
    expect(service.locationUpdateLogs.length).toBe(1);
  });
});
