import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CONFIG } from '../../../environments/environment';

import { AuthService } from '../../auth/auth.service';
import { MqttClientService } from '../../services/mqtt-client.service';

@Component({
    selector: 'app-popup-dialog',
    templateUrl: './popup-dialog.component.html',
    styleUrls: ['./popup-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class PopupDialogComponent implements OnInit {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private authService: AuthService,
    private mqttClientService: MqttClientService,
  ) { }

  ngOnInit(): void {
  }

  saveAsCookieAndUse() {
    this.authService.mqttPassword = this.data.message;
    localStorage.setItem('mqttpwd_' + CONFIG.client_id, this.data.message);
    this.mqttClientService.connect();
  }

}
