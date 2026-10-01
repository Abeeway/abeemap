import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';

import { MqttClientService } from './mqtt-client.service';

export interface LogMessage extends Readonly<Record<string, unknown>> {
  readonly counter: number;
}

export const MAX_LOG_MESSAGES = 500;

@Injectable({
  providedIn: 'root'
})
export class LogsService implements OnInit, OnDestroy {
  
  counter = 0;
  private messages = new BehaviorSubject<readonly LogMessage[]>([]);
  private messageSubscription?: Subscription;
  readonly locationUpdateLogs$ = this.messages.asObservable();

  get locationUpdateLogs(): readonly LogMessage[] {
    return this.messages.value;
  }

  constructor(
    private mqttClientService: MqttClientService
  ) {
  }

  ngOnInit(): void {
    if (this.messageSubscription && !this.messageSubscription.closed) return;
    this.messageSubscription = this.mqttClientService.message$.subscribe((message: unknown) => {
      if (!message || typeof message !== 'object' || Array.isArray(message)) return;
      const entry: LogMessage = { ...message, counter: ++this.counter };
      // Publish a new bounded snapshot rather than mutate the shared MQTT message
      // or a previous table snapshot. Discard oldest messages as new ones arrive.
      this.messages.next([entry, ...this.messages.value.slice(0, MAX_LOG_MESSAGES - 1)]);
    });
  }

  ngOnDestroy(): void {
    this.messageSubscription?.unsubscribe();
  }
}
