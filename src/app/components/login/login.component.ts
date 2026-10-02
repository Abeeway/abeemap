import { Component, Inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { getLoginReturnUrl } from '../../auth/login-return-url';
import { getLoginMqttTopic } from '../../auth/login-token';
import { clearMqttApiKey, isMqttApiKeyRemembered, readMqttApiKey, saveMqttApiKey, setMqttApiKeyRemembered } from '../../auth/mqtt-api-key-storage';
import { generateState } from '../../auth/auth-tools.module';
import { DxAdminApiService } from '../../services/dx-admin-api.service';
import { KeycloakApiService } from '../../services/keycloak-api.service';
import { getApiErrorMessage, isAuthenticationError } from '../../services/service-utils.service';
import { MatSnackBar} from '@angular/material/snack-bar';
import { finalize } from 'rxjs';

import { CONFIG } from '../../../environments/environment';


@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class LoginComponent implements OnInit {

  form: UntypedFormGroup;
  formSubmitAttempt: boolean = false;
  readonly submitting = signal(false);
  readonly loginError = signal('');
  responseType!: string;
  redirectUri!: string;
  clientId!: string;
  scope!: string;
  state!: string;

  platformSelector = '';
  userName = '';
  password = '';
  mqttAPIKey: string;

  constructor(
    private route: ActivatedRoute,
    @Inject(DOCUMENT) private document: Document,
    private fb: UntypedFormBuilder,
    private authService: AuthService,
    private dxAdminApiService: DxAdminApiService,
    private keycloakApiService: KeycloakApiService,
    private snackBar: MatSnackBar,
  ) {

    this.mqttAPIKey = readMqttApiKey() || '';
    
    this.form = this.fb.group({
      platformSelector: ['ECODX', Validators.required],
      userName: ['', Validators.required],
      password: ['', Validators.required],
      mqttAPIKey: [this.mqttAPIKey],
      rememberMqttAPIKey: [isMqttApiKeyRemembered()]
    });
  }

  ngOnInit() {
    const qp = this.route.snapshot.queryParams;
    this.responseType = qp.response_type || '';
    this.redirectUri = qp.redirect_uri || '';
    this.clientId = qp.client_id || '';
    this.scope = qp.scope || '';
    this.state = qp.state || '';

    // Opening /login directly is a local sign-in, rather than a callback from
    // AuthService.login(). Create the same state handshake for this entry point.
    if (qp.redirect_uri === undefined && qp.state === undefined) {
      this.redirectUri = new URL('map', this.document.baseURI).href;
      this.state = generateState();
      sessionStorage.setItem('state_' + CONFIG.client_id, this.state);
    }
  }

  isFieldInvalid(name: string) {
    const field = this.form.get(name);
    return (
      (!field?.valid && field?.touched) ||
      (field?.untouched && this.formSubmitAttempt)
    );
  }

  onSubmit() { 
    if (this.submitting()) return;
    this.loginError.set('');
    this.formSubmitAttempt = true;
    const returnUrl = getLoginReturnUrl(this.redirectUri, this.document.baseURI);
    const state = this.state;
    if (!returnUrl || !state
      || state !== sessionStorage.getItem('state_' + CONFIG.client_id)) {
      const message = returnUrl
        ? 'This login link has expired. Start again to sign in.'
        : 'This login link cannot return to this application. Start again to sign in.';
      this.loginError.set(message);
      this.snackBar.open(message, 'Start again', {
        panelClass: ['red-snackbar'],
      }).onAction().subscribe(() => this.authService.login());
      return;
    }

    if (!this.form.valid) {
      this.form.markAllAsTouched();
      this.loginError.set('Enter your user name and password and select a platform.');
      return;
    }

    if (this.form.valid) {
      this.platformSelector = this.form.get('platformSelector')?.value;
      this.userName = this.form.get('userName')?.value;
      this.password = this.form.get('password')?.value;
      this.mqttAPIKey = this.form.get('mqttAPIKey')?.value;
      // const mqttTopic = this.form.get('mqttTopic')?.value;

      const platform = this.platformSelector;
      switch (platform) {

        case 'PREVDX':
        case 'ECODX':
          this.submitting.set(true);
          this.dxAdminApiService.getToken(
            CONFIG[this.platformSelector].GRANT_TYPE, 
            `${CONFIG.DXAPI_PROFILE}/${this.userName}`, 
            this.password, 
            false, 
            '12hours', 
            this.platformSelector,
          ).pipe(finalize(() => this.submitting.set(false))).subscribe(
            data => this.handleTokenResponse(data, platform, state, returnUrl),
            error => {
              this.loginError.set(getApiErrorMessage(error));
              if (isAuthenticationError(error)) return;
              this.snackBar.open(
                'ERROR: ' + getApiErrorMessage(error),
                'x', {
                  panelClass: ['red-snackbar'],
                }
              );
            }
          );
          break;
        case 'PREVKC':
        case 'ECOKC':
          this.submitting.set(true);
          this.keycloakApiService.getToken(
            this.userName, this.password, 
            CONFIG[this.platformSelector].GRANT_TYPE, 
            CONFIG[this.platformSelector].CLIENT_ID, 
            CONFIG[this.platformSelector].SCOPE,
            this.platformSelector,
          ).pipe(finalize(() => this.submitting.set(false))).subscribe(
            data => this.handleTokenResponse(data, platform, state, returnUrl),
            error => {
              this.loginError.set(getApiErrorMessage(error));
              if (isAuthenticationError(error)) return;
              this.snackBar.open(
                'ERROR: ' + getApiErrorMessage(error),
                'x', {
                  panelClass: ['red-snackbar'],
                }
              );
            }
          );
          break;
        default:
          this.loginError.set('Select a supported location engine platform.');
      }

    }
  }

  private handleTokenResponse(response: unknown, platform: string, state: string, returnUrl: URL): void {
    const token = typeof response === 'object' && response !== null && 'access_token' in response
      ? response.access_token : undefined;
    const mqttTopic = typeof token === 'string' ? getLoginMqttTopic(token, platform) : null;
    if (typeof token !== 'string' || !mqttTopic) {
      this.loginError.set('The server returned an invalid session. Please sign in again.');
      this.snackBar.open('The server returned an invalid session. Please sign in again.', 'x', {
        panelClass: ['red-snackbar'],
      });
      return;
    }

    sessionStorage.setItem('mqttusr_' + CONFIG.client_id, this.userName);
    saveMqttApiKey(this.mqttAPIKey, this.form.get('rememberMqttAPIKey')?.value === true);
    sessionStorage.setItem('mqtttop_' + CONFIG.client_id, mqttTopic);
    sessionStorage.setItem('platform_' + CONFIG.client_id, platform);
    this.finishLogin(token, state, returnUrl);
  }

  private finishLogin(token: string, state: string, returnUrl: URL): void {
    if (this.authService.setSession(token, state)) {
      // Reload to initialize MQTT/log services from the stored session. The token
      // stays in session storage rather than travelling in the return URL.
      this.document.location.assign(returnUrl.href);
    } else {
      this.loginError.set('The server returned an invalid or expired session. Please sign in again.');
      this.snackBar.open('The server returned an invalid or expired session. Please sign in again.', 'x', {
        panelClass: ['red-snackbar'],
      });
    }
  }

  clearMQTTAPIKey() {
    this.form.patchValue({mqttAPIKey: ''});
    clearMqttApiKey();
  }

  onRememberMqttAPIKeyChange(remember: boolean): void {
    setMqttApiKeyRemembered(remember);
  }

  onPlatformChange() {}

}
