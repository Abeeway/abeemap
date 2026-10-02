import { CONFIG } from '../../environments/environment';
import { clearMqttApiKey, clearSessionMqttApiKey, isMqttApiKeyRemembered, readMqttApiKey, saveMqttApiKey, setMqttApiKeyRemembered } from './mqtt-api-key-storage';

const key = 'mqttpwd_' + CONFIG.client_id;
const preference = 'remember_mqttpwd_' + CONFIG.client_id;

describe('MQTT API key storage choice', () => {
  beforeEach(() => {
    clearMqttApiKey();
    localStorage.removeItem(preference);
  });

  afterEach(() => {
    clearMqttApiKey();
    localStorage.removeItem(preference);
  });

  it('remembers by default and reads previously saved keys', () => {
    localStorage.setItem(key, 'legacy-key');
    expect(isMqttApiKeyRemembered()).toBeTrue();
    expect(readMqttApiKey()).toBe('legacy-key');
  });

  it('keeps remembered keys across logout', () => {
    saveMqttApiKey('remembered-key', true);
    clearSessionMqttApiKey();
    expect(localStorage.getItem(key)).toBe('remembered-key');
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(readMqttApiKey()).toBe('remembered-key');
  });

  it('keeps opted-out keys only in session storage until logout', () => {
    saveMqttApiKey('session-key', false);
    expect(isMqttApiKeyRemembered()).toBeFalse();
    expect(localStorage.getItem(key)).toBeNull();
    expect(sessionStorage.getItem(key)).toBe('session-key');
    expect(readMqttApiKey()).toBe('session-key');
    clearSessionMqttApiKey();
    expect(readMqttApiKey()).toBeNull();
    expect(isMqttApiKeyRemembered()).toBeFalse();
  });

  it('removes a previously remembered key immediately on opt-out without losing the session key', () => {
    saveMqttApiKey('old-key', true);
    setMqttApiKeyRemembered(false);
    expect(localStorage.getItem(key)).toBeNull();
    expect(sessionStorage.getItem(key)).toBe('old-key');
    expect(readMqttApiKey()).toBe('old-key');
  });

  it('persists the current session key when the user opts back in', () => {
    saveMqttApiKey('current-key', false);
    setMqttApiKeyRemembered(true);
    expect(localStorage.getItem(key)).toBe('current-key');
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(isMqttApiKeyRemembered()).toBeTrue();
  });

  it('replaces an old key in the selected storage and clears the other storage', () => {
    saveMqttApiKey('old-key', true);
    saveMqttApiKey('replacement-key', false);
    expect(localStorage.getItem(key)).toBeNull();
    expect(sessionStorage.getItem(key)).toBe('replacement-key');
    saveMqttApiKey('new-remembered-key', true);
    expect(localStorage.getItem(key)).toBe('new-remembered-key');
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it('clears keys from both storage locations without changing the preference', () => {
    saveMqttApiKey('session-key', false);
    localStorage.setItem(key, 'stale-key');
    clearMqttApiKey();
    expect(localStorage.getItem(key)).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(isMqttApiKeyRemembered()).toBeFalse();
  });
});
