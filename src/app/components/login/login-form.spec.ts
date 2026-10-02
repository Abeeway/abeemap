import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';

import { CONFIG } from '../../../environments/environment';
import { AppMaterialModule } from '../../app-material.module';
import { AuthService } from '../../auth/auth.service';
import { DxAdminApiService } from '../../services/dx-admin-api.service';
import { KeycloakApiService } from '../../services/keycloak-api.service';
import { LoginComponent } from './login.component';

describe('login form submission', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let dx: jasmine.SpyObj<DxAdminApiService>;
  let response: Subject<unknown>;

  beforeEach(async () => {
    localStorage.removeItem('remember_mqttpwd_' + CONFIG.client_id);
    localStorage.removeItem('mqttpwd_' + CONFIG.client_id);
    sessionStorage.removeItem('mqttpwd_' + CONFIG.client_id);
    spyOnProperty(document, 'baseURI', 'get').and.returnValue(new URL('/abeemap/', document.location.href).href);
    response = new Subject();
    dx = jasmine.createSpyObj<DxAdminApiService>('DxAdminApiService', ['getToken']);
    dx.getToken.and.returnValue(response);
    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [ReactiveFormsModule, AppMaterialModule, NoopAnimationsModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['setSession', 'login']) },
        { provide: DxAdminApiService, useValue: dx },
        { provide: KeycloakApiService, useValue: jasmine.createSpyObj('KeycloakApiService', ['getToken']) },
        { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    response.complete();
    sessionStorage.removeItem('state_' + CONFIG.client_id);
    localStorage.removeItem('mqttpwd_' + CONFIG.client_id);
    localStorage.removeItem('remember_mqttpwd_' + CONFIG.client_id);
    sessionStorage.removeItem('mqttpwd_' + CONFIG.client_id);
  });

  function enterCredentials() {
    for (const [name, value] of [['userName', 'test-user'], ['password', 'test-password']]) {
      const input: HTMLInputElement = fixture.nativeElement.querySelector(`[formControlName="${name}"]`);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    fixture.detectChanges();
  }

  it('clicking Login sends one request and displays progress while awaiting the response', () => {
    enterCredentials();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    button.click();
    fixture.detectChanges();
    expect(dx.getToken).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBeTrue();
    expect(button.textContent).toContain('Signing in');
    fixture.componentInstance.onSubmit();
    expect(dx.getToken).toHaveBeenCalledTimes(1);
  });

  it('submitting the form sends the request without requiring a button click', () => {
    enterCredentials();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(dx.getToken).toHaveBeenCalledTimes(1);
  });

  it('shows an inline error when required fields are missing', () => {
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    fixture.detectChanges();
    expect(dx.getToken).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Enter your user name');
    expect(fixture.componentInstance.form.get('password')?.touched).toBeTrue();
  });

  it('shows authentication failures on the form and re-enables Login', () => {
    enterCredentials();
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    response.error({ status: 401, error: { error_description: 'Invalid credentials' } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Invalid credentials');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeFalse();
  });

  for (const failure of [
    { error: { status: 0 }, message: 'Could not connect to the server' },
    { error: { status: 503, error: { message: 'Service unavailable' } }, message: 'Service unavailable' },
  ]) {
    it(`shows server failure ${failure.error.status} and allows a retry`, () => {
      enterCredentials();
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
      button.click();
      response.error(failure.error);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(failure.message);
      expect(button.disabled).toBeFalse();

      response = new Subject();
      dx.getToken.and.returnValue(response);
      button.click();
      fixture.detectChanges();
      expect(dx.getToken).toHaveBeenCalledTimes(2);
      expect(button.disabled).toBeTrue();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });
  }

  it('shows invalid claims on the form and re-enables Login', () => {
    enterCredentials();
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    response.next({ access_token: 'invalid' });
    response.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('invalid session');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBeFalse();
  });

  it('clears the MQTT key without submitting the form', () => {
    enterCredentials();
    fixture.componentInstance.form.patchValue({ mqttAPIKey: 'test-key' });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button[aria-label="Clear"]').click();
    expect(fixture.componentInstance.form.get('mqttAPIKey')?.value).toBe('');
    expect(dx.getToken).not.toHaveBeenCalled();
  });

  it('remembers by default and removes the persisted key when the checkbox is unchecked', () => {
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('mat-checkbox input');
    expect(checkbox.checked).toBeTrue();
    localStorage.setItem('mqttpwd_' + CONFIG.client_id, 'saved-key');
    checkbox.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.get('rememberMqttAPIKey')?.value).toBeFalse();
    expect(localStorage.getItem('remember_mqttpwd_' + CONFIG.client_id)).toBe('false');
    expect(localStorage.getItem('mqttpwd_' + CONFIG.client_id)).toBeNull();
    expect(sessionStorage.getItem('mqttpwd_' + CONFIG.client_id)).toBe('saved-key');
    expect(dx.getToken).not.toHaveBeenCalled();
  });
});
