import { Component, Inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { getLoginReturnUrl } from '../../auth/login-return-url';
import { generateState } from '../../auth/auth-tools.module';
import { DxAdminApiService } from '../../services/dx-admin-api.service';
import { KeycloakApiService } from '../../services/keycloak-api.service';
import { getApiErrorMessage, isAuthenticationError } from '../../services/service-utils.service';
import { MatSnackBar} from '@angular/material/snack-bar';

// import { jwtDecode } from 'jwt-decode';

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

    this.mqttAPIKey = localStorage.getItem('mqttpwd_' + CONFIG.client_id) || '';
    
    this.form = this.fb.group({
      platformSelector: ['ECODX', Validators.required],
      userName: ['', Validators.required],
      password: ['', Validators.required],
      mqttAPIKey: [this.mqttAPIKey]
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
    this.formSubmitAttempt = true;
    const returnUrl = getLoginReturnUrl(this.redirectUri, this.document.baseURI);
    const state = this.state;
    if (!returnUrl || !state
      || state !== sessionStorage.getItem('state_' + CONFIG.client_id)) {
      const message = returnUrl
        ? 'This login link has expired. Start again to sign in.'
        : 'This login link cannot return to this application. Start again to sign in.';
      this.snackBar.open(message, 'Start again', {
        panelClass: ['red-snackbar'],
      }).onAction().subscribe(() => this.authService.login());
      return;
    }

    if (this.form.valid) {
      this.platformSelector = this.form.get('platformSelector')?.value;
      this.userName = this.form.get('userName')?.value;
      this.password = this.form.get('password')?.value;
      this.mqttAPIKey = this.form.get('mqttAPIKey')?.value;
      // const mqttTopic = this.form.get('mqttTopic')?.value;

      switch (this.platformSelector) {

        case 'PREVDX':
        case 'ECODX':
          this.dxAdminApiService.getToken(
            CONFIG[this.platformSelector].GRANT_TYPE, 
            `${CONFIG.DXAPI_PROFILE}/${this.userName}`, 
            this.password, 
            false, 
            '12hours', 
            this.platformSelector,
          ).subscribe(
            data => {
              if (data) {

                const decodedAccessToken = JSON.parse(atob(data.access_token.split('.')[1]));
                // const decodedAccessToken = jwtDecode(data.access_token) as any;
                const subscriberIdShort = decodedAccessToken.scope[0].split(':')[1];
                const subscriberId = (100000000 + parseInt(subscriberIdShort, 10)).toString();
                const operatorId = CONFIG[this.platformSelector].OPERATOR_ID;
                const mqttTopic = `${operatorId}|${subscriberId}/LE_AS/abeemap/#`;

                sessionStorage.setItem('mqttusr_' + CONFIG.client_id, this.userName);
                localStorage.setItem('mqttpwd_' + CONFIG.client_id, this.mqttAPIKey);
                sessionStorage.setItem('mqtttop_' + CONFIG.client_id, mqttTopic);
                sessionStorage.setItem('platform_' + CONFIG.client_id, this.platformSelector);

                this.finishLogin(data.access_token, state, returnUrl);

              }
            },
            error => {
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
          this.keycloakApiService.getToken(
            this.userName, this.password, 
            CONFIG[this.platformSelector].GRANT_TYPE, 
            CONFIG[this.platformSelector].CLIENT_ID, 
            CONFIG[this.platformSelector].SCOPE,
            this.platformSelector,
          ).subscribe(
            data => {
              if (data) {

                const decodedAccessToken = JSON.parse(atob(data.access_token.split('.')[1]));

                const subscriberId = decodedAccessToken.parentSubscriptions['actility-sup/tpx'][0].subscriberId;
                const realm = CONFIG[this.platformSelector].REALM;
                const operatorId = CONFIG[this.platformSelector].OPERATOR_ID;
                const enduserId = decodedAccessToken.sub;
                const mqttTopic = `${operatorId}|${subscriberId}|${realm}|${enduserId}/LE_AS/abeemap/#`;

                sessionStorage.setItem('mqttusr_' + CONFIG.client_id, this.userName);
                localStorage.setItem('mqttpwd_' + CONFIG.client_id, this.mqttAPIKey);
                sessionStorage.setItem('mqtttop_' + CONFIG.client_id, mqttTopic);
                sessionStorage.setItem('platform_' + CONFIG.client_id, this.platformSelector);

                this.finishLogin(data.access_token, state, returnUrl);

              }
            },
            error => {
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
      }

    }
  }

  private finishLogin(token: string, state: string, returnUrl: URL): void {
    if (this.authService.setSession(token, state)) {
      // Reload to initialize MQTT/log services from the stored session. The token
      // stays in session storage rather than travelling in the return URL.
      this.document.location.assign(returnUrl.href);
    } else {
      this.snackBar.open('The server returned an invalid or expired session. Please sign in again.', 'x', {
        panelClass: ['red-snackbar'],
      });
    }
  }

  clearMQTTAPIKey() {
    this.form.patchValue({mqttAPIKey: ''});
    localStorage.removeItem('mqttpwd_' + CONFIG.client_id);
  }

  onPlatformChange() {}

}
