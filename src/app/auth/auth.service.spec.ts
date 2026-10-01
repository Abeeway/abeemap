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
    exp: Date.now() / 1000 + 3600,
    client_id: 'test-user',
    scope: 'openid profile',
    ...overrides,
  });

  return `${header}.${payload}.signature`;
}

describe('AuthService', () => {
  const key = (name: string) => `${name}_${CONFIG.client_id}`;
  const services: AuthService[] = [];
  function createService(): AuthService {
    const service = new AuthService();
    spyOn(service, 'login');
    services.push(service);
    return service;
  }

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-10-01T12:00:00Z'));
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    services.splice(0).forEach((service) => service.ngOnDestroy());
    jasmine.clock().uninstall();
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

    const service = createService();
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
    const service = createService();

    const accepted = service.setSession(createToken(), 'wrong-state');

    expect(accepted).toBeFalse();
    expect(service.loggedIn).toBeFalse();
    expect(service.token).toBeUndefined();
    expect(sessionStorage.getItem(key('access_token'))).toBeNull();
  });

  it('restores an existing authenticated session on construction', () => {
    const token = createToken({ preferred_username: 'fallback-user', client_id: undefined });
    sessionStorage.setItem(key('access_token'), token);

    const service = createService();

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
    const service = createService();

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
  for (const [name, token] of [
    ['malformed JWT', 'not-a-jwt'],
    ['invalid JSON payload', 'header.bm90LWpzb24.signature'],
    ['null payload', `header.${btoa('null')}.signature`],
    ['missing expiry', createToken({ exp: undefined })],
    ['string expiry', createToken({ exp: '2000000000' })],
    ['null expiry', createToken({ exp: null })],
    ['overflowing expiry', createToken({ exp: Number.MAX_VALUE })],
    ['out-of-range expiry', createToken({ exp: 9000000000000 })],
    ['expired token', createToken({ exp: 1 })],
  ]) {
    it(`clears a cached ${name} without throwing on startup`, () => {
      sessionStorage.setItem(key('access_token'), token);
      sessionStorage.setItem(key('mqttusr'), 'cached-user');
      sessionStorage.setItem(key('platform'), 'PREVDX');
      localStorage.setItem(key('mqttpwd'), 'remembered-key');

      let service!: AuthService;
      expect(() => service = createService()).not.toThrow();
      expect(service.loggedIn).toBeFalse();
      expect(service.token).toBeUndefined();
      expect(service.mqttUserName).toBeNull();
      expect(sessionStorage.getItem(key('access_token'))).toBeNull();
      expect(sessionStorage.getItem(key('mqttusr'))).toBeNull();
      expect(sessionStorage.getItem(key('platform'))).toBeNull();
      expect(localStorage.getItem(key('mqttpwd'))).toBe('remembered-key');
    });
  }

  it('rejects a token at the exact expiry boundary', () => {
    const service = createService();
    expect(service.setSession(createToken({ exp: Date.now() / 1000 }))).toBeFalse();
    expect(service.loggedIn).toBeFalse();
  });

  it('preserves login state after an invalid token so a retry can succeed', () => {
    const service = createService();
    sessionStorage.setItem(key('state'), 'expected-state');
    expect(service.setSession('not-a-jwt', 'expected-state')).toBeFalse();
    expect(sessionStorage.getItem(key('state'))).toBe('expected-state');
    expect(service.setSession(createToken(), 'expected-state')).toBeTrue();
  });

  it('ends an active session and restarts login at expiry', () => {
    const service = createService();
    sessionStorage.setItem(key('state'), 'expected-state');
    service.setSession(createToken({ exp: Date.now() / 1000 + 2 }), 'expected-state');
    const loggedIn = jasmine.createSpy('loggedIn');
    const subscription = service.loggedIn$.subscribe(loggedIn);

    jasmine.clock().tick(1999);
    expect(service.isAuthenticated()).toBeTrue();
    jasmine.clock().tick(1);
    expect(service.loggedIn).toBeFalse();
    expect(loggedIn).toHaveBeenCalledWith(false);
    expect(service.token).toBeUndefined();
    expect(sessionStorage.getItem(key('access_token'))).toBeNull();
    expect(service.login).toHaveBeenCalledOnceWith(window.location.href);
    subscription.unsubscribe();
  });

  it('rechecks expiry if the clock advances before the timer runs', () => {
    const service = createService();
    service.setSession(createToken({ exp: Date.now() / 1000 + 2 }));
    jasmine.clock().mockDate(new Date(Date.now() + 3000));
    expect(service.loggedIn).toBeTrue();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.token).toBeUndefined();
  });

  it('replaces the expiry timer when a new session is accepted', () => {
    const service = createService();
    service.setSession(createToken({ exp: Date.now() / 1000 + 2 }));
    const replacement = createToken({ exp: Date.now() / 1000 + 4 });
    service.setSession(replacement);
    jasmine.clock().tick(2000);
    expect(service.token).toBe(replacement);
    expect(service.isAuthenticated()).toBeTrue();
    jasmine.clock().tick(2000);
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.login).toHaveBeenCalledTimes(1);
  });

  it('does not expire a long-lived token through browser timer overflow', () => {
    const service = createService();
    service.setSession(createToken({ exp: (Date.now() + 2147484647) / 1000 }));
    jasmine.clock().tick(2147483647);
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.login).not.toHaveBeenCalled();
    jasmine.clock().tick(1000);
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.login).toHaveBeenCalledTimes(1);
  });

  it('cancels expiry and automatic login on explicit logout', () => {
    const service = createService();
    service.setSession(createToken({ exp: Date.now() / 1000 + 2 }));
    service.deleteSession();
    jasmine.clock().tick(3000);
    expect(service.login).not.toHaveBeenCalled();
  });

  it('cancels the expiry timer when the service is destroyed', () => {
    const service = createService();
    service.setSession(createToken({ exp: Date.now() / 1000 + 2 }));
    service.ngOnDestroy();
    jasmine.clock().tick(3000);
    expect(service.login).not.toHaveBeenCalled();
  });
});
