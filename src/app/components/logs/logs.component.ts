import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';

import { LogMessage, LogsService } from '../../services/logs.service';

@Component({
    selector: 'app-logs',
    templateUrl: './logs.component.html',
    styleUrls: ['./logs.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class LogsComponent implements OnInit {

  componentTitle = 'Message Logs';
  // elementName = 'device';
  elementIdPropertyName = 'ref';
  displayedColumns: string[] = [
    'counter',
    'deviceEUI',
    'time',
    'messageType',
    'lon',
    'lat',
    'horizontalAccuracy',
    // 'age',
    // 'payload',
  ];

  readonly locationUpdateLogs: Observable<readonly LogMessage[]>;

  isLoading = false;
 
  constructor(
    private logsService: LogsService,
  ) { 
    this.locationUpdateLogs = this.logsService.locationUpdateLogs$;
  }

  ngOnInit(): void {
  }


  str(msg:any) {
    return JSON.stringify(msg);
  }

  formatTime(time:string) {
    const d = new Date(time);
    const d1 = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return d1.toISOString().slice(0, 19).replace('T', ' ');
  }

  formatMessageType(element:any) {
    if (element.uplinkPayload) {
      let formatted = element.uplinkPayload.messageType;
      if (element.uplinkPayload.eventType) {
        formatted += `:${element.uplinkPayload.eventType}`;
      }
      return formatted;
    } else {
      return "";
    }
  }

}
