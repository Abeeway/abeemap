import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

import { ActivatedRoute, Router, UrlTree } from '@angular/router';

// import { AuthService } from '../../auth/auth.service';
import { DxAdminApiService } from '../../services/dx-admin-api.service';
import { KeycloakApiService } from '../../services/keycloak-api.service';
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
    // private router: Router,
    private fb: UntypedFormBuilder,
    // private authService: AuthService,
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
  }

  isFieldInvalid(name: string) {
    const field = this.form.get(name);
    return (
      (!field?.valid && field?.touched) ||
      (field?.untouched && this.formSubmitAttempt)
    );
  }

  onSubmit() { 
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

                const parsedRedirectUri = new URL(this.redirectUri);
                parsedRedirectUri.searchParams.append('access_token', data.access_token);
                parsedRedirectUri.searchParams.append('state', this.state);
                setTimeout(
                  () => { window.location.href = parsedRedirectUri.href; },
                  500
                );

              }
            },
            error => {
              this.snackBar.open(
                'ERROR: ' + JSON.stringify(error.error),
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

                const parsedRedirectUri = new URL(this.redirectUri);
                parsedRedirectUri.searchParams.append('access_token', data.access_token);
                parsedRedirectUri.searchParams.append('state', this.state);
                setTimeout(
                  () => { window.location.href = parsedRedirectUri.href; },
                  500
                );

              }
            },
            error => {
              this.snackBar.open(
                'ERROR: ' + JSON.stringify(error.error),
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
    this.formSubmitAttempt = true;
  }

  clearMQTTAPIKey() {
    this.form.patchValue({mqttAPIKey: ''});
    localStorage.removeItem('mqttpwd_' + CONFIG.client_id);
  }

  onPlatformChange() {}

}
