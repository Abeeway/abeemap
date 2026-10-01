import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { HttpHandler, HttpRequest } from '@angular/common/http';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject, EMPTY, of } from 'rxjs';

import { AuthService } from './auth.service';
import { AuthInterceptor } from './auth.interceptor';
import { canActivate } from './auth.guard';
import { NavigationComponent } from '../components/navigation/navigation.component';
import { MqttClientService } from '../services/mqtt-client.service';

describe('session expiry at application boundaries', () => {
  let auth: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-10-01T12:00:00Z'));
    auth = new AuthService();
    spyOn(auth, 'login');
    const token = `header.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 2 }))}.signature`;
    auth.setSession(token);
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: auth }] });
  });

  afterEach(() => {
    auth.ngOnDestroy();
    jasmine.clock().uninstall();
    sessionStorage.clear();
  });

  function activate() {
    return TestBed.runInInjectionContext(() => canActivate(
      { queryParams: {} } as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
    ));
  }

  it('allows protected routes while the session is valid', () => {
    expect(activate()).toBeTrue();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('rejects expired sessions even when a background timer has not run', () => {
    jasmine.clock().mockDate(new Date(Date.now() + 3000));
    expect(activate()).toBeFalse();
    expect(auth.loggedIn).toBeFalse();
    expect(auth.login).toHaveBeenCalledOnceWith(window.location.href);
  });

  for (const expired of [false, true]) {
    it(`${expired ? 'omits expired' : 'attaches valid'} credentials on HTTP requests`, () => {
      const token = auth.token;
      if (expired) jasmine.clock().mockDate(new Date(Date.now() + 3000));
      const handle = jasmine.createSpy('handle').and.returnValue(EMPTY);
      const interceptor = new AuthInterceptor(auth);
      interceptor.intercept(new HttpRequest('GET', '/api/example'), { handle } as HttpHandler);

      const request = handle.calls.mostRecent().args[0] as HttpRequest<unknown>;
      expect(request.headers.get('Authorization')).toBe(expired ? null : `Bearer ${token}`);
      expect(auth.loggedIn).toBe(!expired);
    });
  }

  it('keeps the authentication stream usable when expiry destroys navigation', () => {
    const observer = { observe: () => of({ matches: false }) } as unknown as BreakpointObserver;
    const mqtt = { connected$: new BehaviorSubject(false) } as unknown as MqttClientService;
    const navigation = new NavigationComponent(auth, observer, mqtt);
    navigation.ngOnInit();
    navigation.ngOnDestroy();

    expect(() => jasmine.clock().tick(2000)).not.toThrow();
    expect(auth.loggedIn$.closed).toBeFalse();
    expect(auth.loggedIn$.getValue()).toBeFalse();
    expect(auth.login).toHaveBeenCalledTimes(1);
  });
});
