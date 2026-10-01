import { CONFIG } from '../../environments/environment';

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

import {
  setCookie, getCookie, deleteCookie, generateState, getQueryParams,
} from './auth-tools.module';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {

  private expiryTimer?: ReturnType<typeof setTimeout>;

  token: string|undefined = undefined;

  // iss: string;
  // iat: number;
  exp: number|undefined = undefined;
  userId: string|undefined = undefined;
  scope: string|undefined = undefined;
  // customerId: number;


  platform: string = '';
  subscriberId: string|null = null;
  mqttUserName: string|null = null;
  mqttTopic: string|null = null;
  mqttPassword: string|null = null;


  // roles: string[];

  loggedIn = false;
  loggedIn$ = new BehaviorSubject<boolean>(false);
  // loggedInAsAdmin = false;

  constructor() {


    // const token = getCookie('access_token_' + CONFIG.client_id);
    const token = sessionStorage.getItem('access_token_' + CONFIG.client_id);

    if (token) {
      this.setSession(token);
    }
  }

  login(redirectURI?: string): void {
    const state = generateState();
    
    // setCookie('state_' + CONFIG.client_id, state, 600, CONFIG.redirect_uri);
    sessionStorage.setItem('state_' + CONFIG.client_id, state);

    // const quaryParams = {
    //   response_type: encodeURIComponent(CONFIG.response_type),
    //   redirect_uri: encodeURIComponent(redirectURI ? redirectURI : CONFIG.redirect_uri),
    //   client_id: encodeURIComponent(CONFIG.client_id),
    //   scope: encodeURIComponent(CONFIG.scope),
    //   state: encodeURIComponent(state)
    // }

    window.location.href = CONFIG.authorizationUrl +
      '?response_type=' + encodeURIComponent(CONFIG.response_type) +
      '&redirect_uri=' + encodeURIComponent(redirectURI ? redirectURI : CONFIG.redirect_uri) +
      '&client_id=' + encodeURIComponent(CONFIG.client_id) +
      '&scope=' + encodeURIComponent(CONFIG.scope) +
      '&state=' + encodeURIComponent(state)
    ;

  }

  setSession(token: string, state?: string) {

    if ( state ) {

      const state1 = sessionStorage.getItem('state_' + CONFIG.client_id);

      if (!state1 || state !== state1) {
        return false;
      }

    }

    let decodedToken: { exp?: unknown; client_id?: string; preferred_username?: string; scope?: string };
    try {
      decodedToken = jwtDecode(token);
    } catch {
      this.deleteSession();
      return false;
    }

    const expiry = decodedToken?.exp;
    if (typeof expiry !== 'number' || !Number.isFinite(expiry)
      || !Number.isFinite(expiry * 1000) || expiry * 1000 > 8640000000000000
      || expiry * 1000 <= Date.now()) {
      this.deleteSession();
      return false;
    }

    this.platform = sessionStorage.getItem('platform_' + CONFIG.client_id) || 'PREVDX';
    this.subscriberId = sessionStorage.getItem('mqttsbs_' + CONFIG.client_id);
    this.mqttUserName = sessionStorage.getItem('mqttusr_' + CONFIG.client_id);
    this.mqttTopic = sessionStorage.getItem('mqtttop_' + CONFIG.client_id);
    this.mqttPassword = localStorage.getItem('mqttpwd_' + CONFIG.client_id);

    this.token = token;

    // this.iss = decodedToken.iss;
    // this.iat = +decodedToken.iat;
    this.exp = expiry;
    this.userId = decodedToken.client_id || decodedToken.preferred_username;
    this.scope = decodedToken.scope;
    // this.customerId = +decodedToken.customerId;

    // this.roles = this.scope.split(' ');
    // this.loggedInAsAdmin = ( this.roles.indexOf('admin') !== -1 );

    if (state) {
      sessionStorage.removeItem('state_' + CONFIG.client_id);
      sessionStorage.setItem('access_token_' + CONFIG.client_id, this.token);
    }

    this.setLoggedIn(true);
    this.scheduleExpiry();

    return true;

  }

  deleteSession() {

    clearTimeout(this.expiryTimer);
    this.expiryTimer = undefined;

    this.token = undefined;

    // this.iss = undefined;
    // this.iat = undefined;
    this.exp = undefined;
    this.userId = undefined;
    this.scope = undefined;
    this.platform = '';
    this.subscriberId = null;
    this.mqttUserName = null;
    this.mqttTopic = null;
    this.mqttPassword = null;
    // this.customerId = undefined;

    // this.roles = undefined;
    // this.loggedInAsAdmin = undefined;

    sessionStorage.removeItem('access_token_' + CONFIG.client_id);

    sessionStorage.removeItem('platform_' + CONFIG.client_id);
    sessionStorage.removeItem('mqttsbs_' + CONFIG.client_id);
    sessionStorage.removeItem('mqttusr_' + CONFIG.client_id);
    sessionStorage.removeItem('mqtttop_' + CONFIG.client_id);
    // localStorage.removeItem('mqttpwd_' + CONFIG.client_id);

    this.setLoggedIn(false);

  }

  setLoggedIn(value: boolean) {
    this.loggedIn$.next(value);
    this.loggedIn = value;
  }

  isAuthenticated(): boolean {
    if (!this.loggedIn) return false;
    if (!this.token || typeof this.exp !== 'number' || !Number.isFinite(this.exp)
      || this.exp * 1000 <= Date.now()) {
      this.deleteSession();
      return false;
    }
    return true;
  }

  private scheduleExpiry(): void {
    clearTimeout(this.expiryTimer);
    const remaining = (this.exp || 0) * 1000 - Date.now();
    // Browser timers overflow past approximately 24.8 days. Recheck long-lived
    // sessions in chunks, using the clock again when a suspended tab resumes.
    this.expiryTimer = setTimeout(() => {
      if (this.isAuthenticated()) this.scheduleExpiry();
      else this.login(window.location.href);
    }, Math.min(Math.max(remaining, 0), 2147483647));
  }

  ngOnDestroy(): void {
    clearTimeout(this.expiryTimer);
  }


  getExp() {
    const d = new Date(1000 * (this.exp || 0));
    return (new Date(d.getTime() - d.getTimezoneOffset() * 60000)).toISOString().slice(0, 19).replace('T', ' ');
  }
}
