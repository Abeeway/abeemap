import { CONFIG } from '../../environments/environment';

const KEY = 'mqttpwd_' + CONFIG.client_id;
const REMEMBER_KEY = 'remember_mqttpwd_' + CONFIG.client_id;

export function isMqttApiKeyRemembered(): boolean {
  // Existing installations keep their saved key unless the user opts out.
  return localStorage.getItem(REMEMBER_KEY) !== 'false';
}

export function readMqttApiKey(): string | null {
  return (isMqttApiKeyRemembered() ? localStorage : sessionStorage).getItem(KEY);
}

export function setMqttApiKeyRemembered(remember: boolean): void {
  const previousStorage = remember ? sessionStorage : localStorage;
  const selectedStorage = remember ? localStorage : sessionStorage;
  const previousKey = previousStorage.getItem(KEY);
  if (previousKey !== null) selectedStorage.setItem(KEY, previousKey);
  previousStorage.removeItem(KEY);
  localStorage.setItem(REMEMBER_KEY, String(remember));
}

export function saveMqttApiKey(apiKey: string, remember: boolean): void {
  setMqttApiKeyRemembered(remember);
  (remember ? localStorage : sessionStorage).setItem(KEY, apiKey);
}

export function clearMqttApiKey(): void {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}

export function clearSessionMqttApiKey(): void {
  sessionStorage.removeItem(KEY);
  if (!isMqttApiKeyRemembered()) localStorage.removeItem(KEY);
}
