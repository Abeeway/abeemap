import { CONFIG } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { saveMqttApiKey } from '../../auth/mqtt-api-key-storage';
import { MqttClientService } from '../../services/mqtt-client.service';
import { PopupDialogComponent } from './popup-dialog.component';

describe('created MQTT API key persistence', () => {
  const key = 'mqttpwd_' + CONFIG.client_id;
  const preference = 'remember_mqttpwd_' + CONFIG.client_id;

  beforeEach(() => {
    localStorage.removeItem(key);
    localStorage.removeItem(preference);
    sessionStorage.removeItem(key);
  });

  afterEach(() => {
    localStorage.removeItem(key);
    localStorage.removeItem(preference);
    sessionStorage.removeItem(key);
  });

  for (const remember of [true, false]) {
    it(`uses the created key with remembering ${remember ? 'enabled' : 'disabled'}`, () => {
      const auth = { mqttPassword: null } as AuthService;
      const mqtt = jasmine.createSpyObj<MqttClientService>('MqttClientService', ['connect']);
      const component = new PopupDialogComponent({ message: 'new-key' }, auth, mqtt);
      expect(component.rememberMqttAPIKey).toBeTrue();
      component.onRememberMqttAPIKeyChange(remember);
      component.saveAndUse();
      expect(auth.mqttPassword).toBe('new-key');
      expect(mqtt.connect).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem(key)).toBe(remember ? 'new-key' : null);
      expect(sessionStorage.getItem(key)).toBe(remember ? null : 'new-key');
    });
  }

  it('respects an existing opt-out when opening the dialog', () => {
    saveMqttApiKey('session-key', false);
    const component = new PopupDialogComponent({}, {} as AuthService, {} as MqttClientService);
    expect(component.rememberMqttAPIKey).toBeFalse();
  });
});
