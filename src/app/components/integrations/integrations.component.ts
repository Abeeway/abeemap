import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { CONFIG } from '../../../environments/environment';

import { AuthService } from '../../auth/auth.service';

//wizard
import {
  FormBuilder, 
  Validators
} from '@angular/forms';

import { IntegrationsService } from '../../services/integrations.service'; 

@Component({
    selector: 'app-integrations',
    templateUrl: './integrations.component.html',
    styleUrls: ['./integrations.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class IntegrationsComponent implements OnInit {

  userId:string|null = ''; 
  targetURL = '';
  trackerCommandsAPI = '';
  mqttBrokerWSS = '';
  mqttBrokerSSL = '';
  componentTitle = 'Integrations';

  // wizard
  firstFormGroup = this._formBuilder.group({
    lePlatformCtrl: ['', Validators.required],
    nsVendorCtrl: ['actility', Validators.required],
    nsIntegrationTypeCtrl: ['mqtt', Validators.required],
    asCtrl: ['abeemap', Validators.required],
    asIdCtrl: ['abeemap', Validators.required],
    asIntegrationTypeCtrl: ['http', Validators.required],
    asUrlCtrl: ['https://appserver.example.com', Validators.required],
    downlinkApiUrlCtrl: ['https://downlinkapi.example.com'],
    downlinkApiKeyCtrl: ['123456789'],
  });
  secondFormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required],
  });
  nsVendors = [
    { name: "Actility", id: "actility"},
    { name: "Chirpstack", id: "chirpstack"},
    { name: "Everynet", id: "everynet"},
    { name: "Helium", id: "helium"},
    { name: "Kerlink", id: "kerlink"},
    { name: "Loriot", id: "loriot"},
    { name: "Proximus", id: "proximus"},
    { name: "Senet", id: "senet"},
    { name: "TTN", id: "ttn"},
  ]

  constructor(
    // wizard
    private _formBuilder: FormBuilder,
    public authService: AuthService, 
    public integrationsService: IntegrationsService,

  ) { }

  ngOnInit(): void {

    let lePlatformCtrl = this.firstFormGroup.get('lePlatformCtrl');
    lePlatformCtrl?.setValue(this.authService.platform);

    const platform_config = this.getPlatformConfig();
    this.trackerCommandsAPI = `${platform_config.API_BASE_URL}/location/latest/api/trackerCommands`;
    this.mqttBrokerWSS = `${platform_config.MQTT_WS_PROTOCOL}://${platform_config.MQTT_WS_BROKER}:${platform_config.MQTT_WS_PORT}/${platform_config.MQTT_WS_PATH}`;
    this.mqttBrokerSSL = `${platform_config.MQTT_PROTOCOL}://${platform_config.MQTT_BROKER}:${platform_config.MQTT_PORT}`;

    let LE_AS_Topic = this.authService.mqttTopic;
    if (!LE_AS_Topic) return;
    const topicSegments = LE_AS_Topic.split('/');
    this.userId = topicSegments[0];
    const userIdSegments = topicSegments[0].split('|');
    this.targetURL = `${CONFIG.nitURL}/mqtt/${userIdSegments[0]}/${userIdSegments[1]}/${topicSegments[1]}`;
  
  }

  onASChange() {
    let asIdCtrl = this.firstFormGroup.get('asIdCtrl');
    if (!asIdCtrl) return;
    switch (this.firstFormGroup.value.asCtrl) {
      case 'adm':
        asIdCtrl.setValue('adm');
        break;
      case 'abeemap':
        asIdCtrl.setValue('abeemap');
        break;
      default:
        asIdCtrl.setValue('as01');
    }
  }

  getPlatformConfig() {
    let platformName = this.firstFormGroup.value.lePlatformCtrl;
    return platformName ? CONFIG[platformName] : CONFIG['ECODX'];
  }

  onPlatformChange() {

    const platform_config = this.getPlatformConfig();
    this.trackerCommandsAPI = `${platform_config.API_BASE_URL}/location/latest/api/trackerCommands`;
    this.mqttBrokerWSS = `${platform_config.MQTT_WS_PROTOCOL}://${platform_config.MQTT_WS_BROKER}:${platform_config.MQTT_WS_PORT}/${platform_config.MQTT_WS_PATH}`;
    this.mqttBrokerSSL = `${platform_config.MQTT_PROTOCOL}://${platform_config.MQTT_BROKER}:${platform_config.MQTT_PORT}`;

    let nsIntegrationTypeCtrl = this.firstFormGroup.get('nsIntegrationTypeCtrl');
    if (!nsIntegrationTypeCtrl) return;

    if (
      ( (this.firstFormGroup.value.lePlatformCtrl == 'ECOKC') || (this.firstFormGroup.value.lePlatformCtrl == 'PREVKC') )
      && (this.firstFormGroup.value.nsIntegrationTypeCtrl === 'mqtt')
    ) {
      nsIntegrationTypeCtrl.setValue('http');
    }
  }

}
