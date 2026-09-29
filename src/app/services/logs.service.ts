import { Injectable, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { MqttClientService } from './mqtt-client.service';


@Injectable({
  providedIn: 'root'
})
export class LogsService implements OnInit {
  
  counter = 0;
  locationUpdateLogs: Array<string> = [];
  locationUpdateLogs$ = new BehaviorSubject<any>({});

  constructor(
    private mqttClientService: MqttClientService
  ) {
  }

  ngOnInit(): void { 
    this.mqttClientService.message$.subscribe( (msg) => {
      this.counter++;
      msg.counter = this.counter;
      this.locationUpdateLogs.unshift(msg);
      this.locationUpdateLogs$.next(this.locationUpdateLogs);
    })
  }

}
