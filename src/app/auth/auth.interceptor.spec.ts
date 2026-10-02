import { DOCUMENT } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClient, HttpErrorResponse, HttpHeaders, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CONFIG } from '../../environments/environment';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('bearer token request scope', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let client: HttpClient;
  let http: HttpTestingController;
  const token = 'test-access-token';
  const baseURI = 'https://nano-things.net/abeemap/';

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated']);
    auth.isAuthenticated.and.returnValue(true);
    auth.token = token;
    auth.platform = 'ECODX';
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptorsFromDi()),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: auth },
      { provide: DOCUMENT, useValue: { baseURI } },
      { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    ] });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function expectAuthorization(url: string, expected: string | null) {
    client.get(url).subscribe();
    const request = http.expectOne(url);
    expect(request.request.headers.get('Authorization')).toBe(expected);
    request.flush({});
  }

  for (const platform of ['ECODX', 'ECOKC', 'PREVDX', 'PREVKC']) {
    for (const path of ['', '/', '/core/latest/api/devices', '/location-alarm-config/latest/api/bluetoothMap',
      '/location-key-management/latest/api/apiKeys?limit=10']) {
      it(`attaches the token within ${platform} API path ${path || '(base)'}`, () => {
        auth.platform = platform;
        expectAuthorization(`${CONFIG[platform].API_BASE_URL}${path}`, `Bearer ${token}`);
      });
    }

    for (const other of ['ECODX', 'ECOKC', 'PREVDX', 'PREVKC'].filter((value) => value !== platform)) {
      it(`omits the ${platform} token on the ${other} API`, () => {
        auth.platform = platform;
        expectAuthorization(`${CONFIG[other].API_BASE_URL}/core/latest/api/devices`, null);
      });
    }
  }

  for (const url of [
    'assets/device-names.jsonc', './assets/floorplans.jsonc', '/abeemap/assets/floorplan.png',
    'https://nano-things.net/abeemap/assets/device-names.jsonc', 'https://nano-things.net/unrelated',
    'https://nano-things.net/abeemap_api_extra/core/latest/api/devices',
    'https://nano-things.net/abeemap_api/../outside',
    'https://nano-things.net/abeemap_api/%2e%2e/outside',
    'https://nano-things.net/outside?return=https://nano-things.net/abeemap_api/core',
    'https://other.example/abeemap_api/core/latest/api/devices',
    'https://nano-things.net.attacker.example/abeemap_api/core',
    'https://nano-things.net@attacker.example/abeemap_api/core',
    '//other.example/abeemap_api/core', 'http://nano-things.net/abeemap_api/core',
    'https://nano-things.net:444/abeemap_api/core',
    'https://user:password@nano-things.net/abeemap_api/core', 'https://[invalid',
  ]) {
    it(`omits the token outside the selected API: ${url}`, () => {
      expectAuthorization(url, null);
    });
  }

  for (const url of ['/abeemap_api/core/latest/api/devices', '../abeemap_api/core/latest/api/devices',
    '//nano-things.net/abeemap_api/core/latest/api/devices']) {
    it(`resolves a relative API request against the document base: ${url}`, () => {
      expectAuthorization(url, `Bearer ${token}`);
    });
  }

  it('does not attach an unauthenticated token', () => {
    auth.isAuthenticated.and.returnValue(false);
    expectAuthorization(`${CONFIG.ECODX.API_BASE_URL}/core/latest/api/devices`, null);
  });

  it('does not attach a missing token', () => {
    auth.token = undefined;
    expectAuthorization(`${CONFIG.ECODX.API_BASE_URL}/core/latest/api/devices`, null);
  });

  for (const platform of ['', 'unknown', 'constructor']) {
    it(`fails closed for an invalid selected platform ${platform || '(empty)'}`, () => {
      auth.platform = platform;
      expectAuthorization(`${CONFIG.ECODX.API_BASE_URL}/core/latest/api/devices`, null);
    });
  }

  it('preserves caller-provided headers on an unrelated request', () => {
    const headers = new HttpHeaders({ Authorization: 'Basic caller-credentials', 'X-Custom': 'value' });
    client.get('https://other.example/api', { headers }).subscribe();
    const request = http.expectOne('https://other.example/api');
    expect(request.request.headers.get('Authorization')).toBe('Basic caller-credentials');
    expect(request.request.headers.get('X-Custom')).toBe('value');
    request.flush({});
  });

  it('passes sensitive responses through without console logging', () => {
    const log = spyOn(console, 'log');
    const body = { access_token: 'response-token', apiKey: 'response-api-key' };
    const received = jasmine.createSpy('received');
    const url = `${CONFIG.ECODX.API_BASE_URL}/admin/latest/api/oauth/token`;
    client.post(url, {}).subscribe(received);
    http.expectOne(url).flush(body);
    expect(received).toHaveBeenCalledOnceWith(body);
    expect(log).not.toHaveBeenCalled();
  });

  it('preserves HTTP errors for subscribers', () => {
    const failed = jasmine.createSpy('failed');
    const url = `${CONFIG.ECODX.API_BASE_URL}/core/latest/api/devices`;
    client.get(url).subscribe({ error: failed });
    http.expectOne(url).flush({ message: 'Unavailable' }, { status: 503, statusText: 'Service Unavailable' });
    expect(failed).toHaveBeenCalledOnceWith(jasmine.any(HttpErrorResponse));
    expect((failed.calls.mostRecent().args[0] as HttpErrorResponse).status).toBe(503);
  });
});
