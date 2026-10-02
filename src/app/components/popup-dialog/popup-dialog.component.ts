import { Component, OnInit, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { isMqttApiKeyRemembered, saveMqttApiKey, setMqttApiKeyRemembered } from '../../auth/mqtt-api-key-storage';

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
  rememberMqttAPIKey = isMqttApiKeyRemembered();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private authService: AuthService,
    private mqttClientService: MqttClientService,
  ) { }

  ngOnInit(): void {
  }

  saveAndUse() {
    this.authService.mqttPassword = this.data.message;
    saveMqttApiKey(this.data.message, this.rememberMqttAPIKey);
    this.mqttClientService.connect();
  }

  onRememberMqttAPIKeyChange(remember: boolean): void {
    this.rememberMqttAPIKey = remember;
    setMqttApiKeyRemembered(remember);
  }

}
