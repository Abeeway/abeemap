import { CONFIG } from '../../environments/environment';
import { AuthService } from './auth.service';

function encodeJwtPart(value: object): string {
  return btoa(JSON.stringify(value))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createToken(overrides: Record<string, unknown> = {}): string {
  const header = encodeJwtPart({ alg: 'none', typ: 'JWT' });
  const payload = encodeJwtPart({
    exp: 2000000000,
    client_id: 'test-user',
    scope: 'openid profile',
    ...overrides,
  });

  return `${header}.${payload}.signature`;
}

describe('AuthService', () => {
  const key = (name: string) => `${name}_${CONFIG.client_id}`;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('accepts a matching state and restores the MQTT session', () => {
    const token = createToken();
    sessionStorage.setItem(key('state'), 'expected-state');
    sessionStorage.setItem(key('platform'), 'PREVDX');
    sessionStorage.setItem(key('mqttsbs'), 'subscriber-1');
    sessionStorage.setItem(key('mqttusr'), 'mqtt-user');
    sessionStorage.setItem(key('mqtttop'), 'subscriber-1/LE_AS/abeemap/#');
    localStorage.setItem(key('mqttpwd'), 'api-key');

    const service = new AuthService();
    const accepted = service.setSession(token, 'expected-state');

    expect(accepted).toBeTrue();
    expect(service.loggedIn).toBeTrue();
    expect(service.userId).toBe('test-user');
    expect(service.mqttUserName).toBe('mqtt-user');
    expect(service.mqttPassword).toBe('api-key');
    expect(sessionStorage.getItem(key('access_token'))).toBe(token);
    expect(sessionStorage.getItem(key('state'))).toBeNull();
  });

  it('rejects a mismatched state without storing the token', () => {
    sessionStorage.setItem(key('state'), 'expected-state');
    const service = new AuthService();

    const accepted = service.setSession(createToken(), 'wrong-state');

    expect(accepted).toBeFalse();
    expect(service.loggedIn).toBeFalse();
    expect(service.token).toBeUndefined();
    expect(sessionStorage.getItem(key('access_token'))).toBeNull();
  });

  it('restores an existing authenticated session on construction', () => {
    const token = createToken({ preferred_username: 'fallback-user', client_id: undefined });
    sessionStorage.setItem(key('access_token'), token);

    const service = new AuthService();

    expect(service.loggedIn).toBeTrue();
    expect(service.token).toBe(token);
    expect(service.userId).toBe('fallback-user');
  });

  it('clears session storage and in-memory credentials on logout', () => {
    const token = createToken();
    sessionStorage.setItem(key('access_token'), token);
    sessionStorage.setItem(key('platform'), 'PREVDX');
    sessionStorage.setItem(key('mqttsbs'), 'subscriber-1');
    sessionStorage.setItem(key('mqttusr'), 'mqtt-user');
    sessionStorage.setItem(key('mqtttop'), 'subscriber-1/LE_AS/abeemap/#');
    localStorage.setItem(key('mqttpwd'), 'remembered-api-key');
    const service = new AuthService();

    service.deleteSession();

    expect(service.loggedIn).toBeFalse();
    expect(service.token).toBeUndefined();
    expect(service.platform).toBe('');
    expect(service.subscriberId).toBeNull();
    expect(service.mqttUserName).toBeNull();
    expect(service.mqttTopic).toBeNull();
    expect(service.mqttPassword).toBeNull();
    expect(sessionStorage.getItem(key('access_token'))).toBeNull();
    expect(sessionStorage.getItem(key('platform'))).toBeNull();
    expect(sessionStorage.getItem(key('mqttsbs'))).toBeNull();
    expect(sessionStorage.getItem(key('mqttusr'))).toBeNull();
    expect(sessionStorage.getItem(key('mqtttop'))).toBeNull();
    expect(localStorage.getItem(key('mqttpwd'))).toBe('remembered-api-key');
  });
});
