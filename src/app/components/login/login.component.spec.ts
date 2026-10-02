import { UntypedFormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { of, Subject } from 'rxjs';

import { CONFIG } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { DxAdminApiService } from '../../services/dx-admin-api.service';
import { KeycloakApiService } from '../../services/keycloak-api.service';
import { LoginComponent } from './login.component';

describe('LoginComponent return handling', () => {
  let component: LoginComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let dx: jasmine.SpyObj<DxAdminApiService>;
  let keycloak: jasmine.SpyObj<KeycloakApiService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let assign: jasmine.Spy;
  let restart: Subject<void>;

  beforeEach(() => {
    localStorage.removeItem('remember_mqttpwd_' + CONFIG.client_id);
    sessionStorage.removeItem('mqttpwd_' + CONFIG.client_id);
    sessionStorage.setItem('state_' + CONFIG.client_id, 'expected-state');
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['setSession', 'login']);
    auth.setSession.and.returnValue(true);
    dx = jasmine.createSpyObj<DxAdminApiService>('DxAdminApiService', ['getToken']);
    keycloak = jasmine.createSpyObj<KeycloakApiService>('KeycloakApiService', ['getToken']);
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    restart = new Subject<void>();
    const snackBarRef = jasmine.createSpyObj<MatSnackBarRef<TextOnlySnackBar>>('MatSnackBarRef', ['onAction']);
    snackBarRef.onAction.and.returnValue(restart);
    snackBar.open.and.returnValue(snackBarRef);
    assign = jasmine.createSpy('assign');
    const document = {
      baseURI: 'https://example.com/abeemap/',
      location: { assign },
    } as unknown as Document;
    const route = { snapshot: { queryParams: {
      redirect_uri: 'https://example.com/abeemap/map?filter=active',
      state: 'expected-state',
    } } } as unknown as ActivatedRoute;

    component = new LoginComponent(route, document, new UntypedFormBuilder(), auth, dx, keycloak, snackBar);
    component.ngOnInit();
    component.form.patchValue({ userName: 'test-user', password: 'test-password', mqttAPIKey: 'test-key' });
  });

  afterEach(() => {
    sessionStorage.removeItem('state_' + CONFIG.client_id);
    for (const key of ['mqttusr', 'mqtttop', 'platform']) {
      sessionStorage.removeItem(key + '_' + CONFIG.client_id);
    }
    localStorage.removeItem('mqttpwd_' + CONFIG.client_id);
    localStorage.removeItem('remember_mqttpwd_' + CONFIG.client_id);
    sessionStorage.removeItem('mqttpwd_' + CONFIG.client_id);
  });

  for (const platform of ['PREVDX', 'ECODX', 'PREVKC', 'ECOKC']) {
    it(`blocks an external return URL before calling ${platform} authentication`, () => {
      component.form.patchValue({ platformSelector: platform });
      component.redirectUri = 'https://attacker.example/collect';
      component.onSubmit();

      expect(dx.getToken).not.toHaveBeenCalled();
      expect(keycloak.getToken).not.toHaveBeenCalled();
      expect(auth.setSession).not.toHaveBeenCalled();
      expect(assign).not.toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalled();
    });

    it(`stores the ${platform} session and returns without a token in the URL`, () => {
      component.form.patchValue({ platformSelector: platform });
      const payload = platform.endsWith('DX')
        ? { scope: ['SUBSCRIBER:123'] }
        : { parentSubscriptions: { 'actility-sup/tpx': [{ subscriberId: '123' }] }, sub: 'user-1' };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      dx.getToken.and.returnValue(of({ access_token: token }));
      keycloak.getToken.and.returnValue(of({ access_token: token }));
      component.onSubmit();

      expect(auth.setSession).toHaveBeenCalledOnceWith(token, 'expected-state');
      expect(assign).toHaveBeenCalledOnceWith('https://example.com/abeemap/map?filter=active');
      expect(component.form.get('rememberMqttAPIKey')?.value).toBeTrue();
      expect(localStorage.getItem('mqttpwd_' + CONFIG.client_id)).toBe('test-key');
      expect(sessionStorage.getItem('mqttpwd_' + CONFIG.client_id)).toBeNull();
    });

    it(`keeps an opted-out ${platform} API key only in session storage`, () => {
      component.form.patchValue({ platformSelector: platform, rememberMqttAPIKey: false });
      const payload = platform.endsWith('DX')
        ? { scope: ['SUBSCRIBER:123'] }
        : { parentSubscriptions: { 'actility-sup/tpx': [{ subscriberId: '123' }] }, sub: 'user-1' };
      const token = `header.${btoa(JSON.stringify(payload))}.signature`;
      dx.getToken.and.returnValue(of({ access_token: token }));
      keycloak.getToken.and.returnValue(of({ access_token: token }));
      component.onSubmit();
      expect(assign).toHaveBeenCalled();
      expect(localStorage.getItem('mqttpwd_' + CONFIG.client_id)).toBeNull();
      expect(sessionStorage.getItem('mqttpwd_' + CONFIG.client_id)).toBe('test-key');
    });

    for (const response of [null, {}, { access_token: 123 }, { access_token: 'malformed' },
      { access_token: `header.${btoa('{}')}.signature` }]) {
      it(`rejects invalid ${platform} token responses without persisting MQTT credentials`, () => {
        component.form.patchValue({ platformSelector: platform });
        sessionStorage.setItem('mqtttop_' + CONFIG.client_id, 'existing-topic');
        localStorage.setItem('mqttpwd_' + CONFIG.client_id, 'existing-key');
        dx.getToken.and.returnValue(of(response));
        keycloak.getToken.and.returnValue(of(response));
        component.onSubmit();

        expect(auth.setSession).not.toHaveBeenCalled();
        expect(assign).not.toHaveBeenCalled();
        expect(snackBar.open).toHaveBeenCalledTimes(1);
        expect(sessionStorage.getItem('mqtttop_' + CONFIG.client_id)).toBe('existing-topic');
        expect(localStorage.getItem('mqttpwd_' + CONFIG.client_id)).toBe('existing-key');
        expect(sessionStorage.getItem('platform_' + CONFIG.client_id)).toBeNull();
      });
    }
  }

  for (const state of ['', 'wrong-state']) {
    it(`rejects ${state || 'missing'} state before requesting credentials`, () => {
      component.state = state;
      component.onSubmit();
      expect(dx.getToken).not.toHaveBeenCalled();
      expect(keycloak.getToken).not.toHaveBeenCalled();
      expect(assign).not.toHaveBeenCalled();
    });
  }

  it('rejects a missing return URL without throwing', () => {
    component.redirectUri = '';
    expect(() => component.onSubmit()).not.toThrow();
    expect(dx.getToken).not.toHaveBeenCalled();
  });

  it('supports opening /login directly and establishes a real local session', () => {
    const route = { snapshot: { queryParams: {} } } as unknown as ActivatedRoute;
    const document = {
      baseURI: 'https://example.com/abeemap/',
      location: { assign },
    } as unknown as Document;
    const realAuth = new AuthService();
    component = new LoginComponent(route, document, new UntypedFormBuilder(), realAuth, dx, keycloak, snackBar);
    component.ngOnInit();
    expect(component.state).toBeTruthy();
    expect(sessionStorage.getItem('state_' + CONFIG.client_id)).toBe(component.state);
    expect(component.redirectUri).toBe('https://example.com/abeemap/map');

    const token = `header.${btoa(JSON.stringify({ scope: ['SUBSCRIBER:123'], exp: 2000000000 }))}.signature`;
    dx.getToken.and.returnValue(of({ access_token: token }));
    component.form.patchValue({ userName: 'test-user', password: 'test-password' });
    component.onSubmit();

    expect(realAuth.loggedIn).toBeTrue();
    expect(sessionStorage.getItem('access_token_' + CONFIG.client_id)).toBe(token);
    expect(assign).toHaveBeenCalledOnceWith('https://example.com/abeemap/map');
    realAuth.ngOnDestroy();
    sessionStorage.removeItem('access_token_' + CONFIG.client_id);
  });

  it('does not replace supplied callback parameters with a fresh local login', () => {
    const route = { snapshot: { queryParams: {
      redirect_uri: 'https://attacker.example/collect',
    } } } as unknown as ActivatedRoute;
    const document = { baseURI: 'https://example.com/abeemap/', location: { assign } } as unknown as Document;
    component = new LoginComponent(route, document, new UntypedFormBuilder(), auth, dx, keycloak, snackBar);
    component.ngOnInit();
    component.form.patchValue({ userName: 'test-user', password: 'test-password' });
    component.onSubmit();

    expect(component.state).toBe('');
    expect(dx.getToken).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('does not navigate if the state is rejected when the token arrives', () => {
    auth.setSession.and.returnValue(false);
    dx.getToken.and.returnValue(of({ access_token: `header.${btoa(JSON.stringify({ scope: ['SUBSCRIBER:123'] }))}.signature` }));
    component.onSubmit();
    expect(auth.setSession).toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('lets the user restart an expired login without requesting a token first', () => {
    component.state = 'expired-state';
    component.onSubmit();
    expect(dx.getToken).not.toHaveBeenCalled();
    expect(auth.login).not.toHaveBeenCalled();

    restart.next();
    expect(auth.login).toHaveBeenCalledTimes(1);
  });
});
