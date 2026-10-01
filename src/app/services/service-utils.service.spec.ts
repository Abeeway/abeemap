import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { getApiErrorMessage, ServiceUtilsService } from './service-utils.service';

describe('ServiceUtilsService API error handling', () => {
  let service: ServiceUtilsService;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let auth: jasmine.SpyObj<AuthService>;
  let action: Subject<void>;

  beforeEach(() => {
    spyOn(console, 'error');
    action = new Subject<void>();
    const ref = jasmine.createSpyObj<MatSnackBarRef<TextOnlySnackBar>>('SnackBarRef', ['onAction']);
    ref.onAction.and.returnValue(action);
    snackBar = jasmine.createSpyObj<MatSnackBar>('SnackBar', ['open']);
    snackBar.open.and.returnValue(ref);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['deleteSession', 'login']);
    service = new ServiceUtilsService(snackBar, auth);
  });

  afterEach(() => action.complete());

  const cases: Array<{ name: string; error: unknown; message: string }> = [
    { name: 'network error', error: new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }), message: 'Could not connect to the server. Please try again.' },
    { name: 'OAuth error', error: new HttpErrorResponse({ status: 400, error: { error: 'invalid_grant', error_description: 'Invalid credentials' } }), message: 'Invalid credentials' },
    { name: 'nested API message', error: new HttpErrorResponse({ status: 500, error: { message: { message: 'Service unavailable' } } }), message: 'Service unavailable' },
    { name: 'plain API message', error: new HttpErrorResponse({ status: 500, error: { message: 'Try later' } }), message: 'Try later' },
    { name: 'text body', error: new HttpErrorResponse({ status: 502, error: 'Bad gateway' }), message: 'Bad gateway' },
    { name: 'missing error body', error: new HttpErrorResponse({ status: 401 }), message: 'Authentication required. Please sign in.' },
    { name: 'plain exception', error: new Error('Unexpected failure'), message: 'Unexpected failure' },
    { name: 'null exception', error: null, message: 'The request failed. Please try again.' },
  ];

  for (const { name, error, message } of cases) {
    it(`preserves a ${name} without emitting success or throwing while formatting`, () => {
      const next = jasmine.createSpy('success');
      const failed = jasmine.createSpy('failure');
      expect(() => service.handleError('test')(error).subscribe({ next, error: failed })).not.toThrow();
      expect(next).not.toHaveBeenCalled();
      expect(failed).toHaveBeenCalledOnceWith(error);
      expect(getApiErrorMessage(error)).toBe(message);
    });
  }

  for (const status of [401, 403]) {
    it(`offers a working login action for HTTP ${status} regardless of body code`, () => {
      const error = new HttpErrorResponse({ status, error: { code: 500, message: 'Access denied' } });
      service.handleError()(error).subscribe({ error: () => {} });
      expect(snackBar.open).toHaveBeenCalledOnceWith('Access denied', 'Login', { panelClass: ['red-snackbar'] });
      expect(auth.deleteSession).not.toHaveBeenCalled();
      expect(auth.login).not.toHaveBeenCalled();
      action.next();
      expect(auth.deleteSession).toHaveBeenCalledTimes(1);
      expect(auth.login).toHaveBeenCalledTimes(1);
      expect(auth.deleteSession).toHaveBeenCalledBefore(auth.login);
      action.next();
      expect(auth.login).toHaveBeenCalledTimes(1);
    });
  }

  it('does not classify a server error as authentication failure from its body code', () => {
    service.handleError()(new HttpErrorResponse({ status: 500, error: { code: 401 } }))
      .subscribe({ error: () => {} });
    expect(snackBar.open).not.toHaveBeenCalled();
  });
});
