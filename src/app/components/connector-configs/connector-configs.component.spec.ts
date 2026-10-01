import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { of, Subject } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { DxLocationApiService } from '../../services/dx-location-api.service';
import { AlertDialogComponent } from '../alert-dialog/alert-dialog.component';
import { ConnectorConfigsComponent } from './connector-configs.component';

describe('connector deletion API failures', () => {
  let component: ConnectorConfigsComponent;
  let http: HttpTestingController;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let auth: jasmine.SpyObj<AuthService>;
  let action: Subject<void>;
  const element = { ref: 'config-1' };

  beforeEach(() => {
    spyOn(console, 'error');
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['deleteSession', 'login']);
    auth.platform = 'ECODX';
    action = new Subject<void>();
    const snackBarRef = jasmine.createSpyObj<MatSnackBarRef<TextOnlySnackBar>>('SnackBarRef', ['onAction']);
    snackBarRef.onAction.and.returnValue(action);
    snackBar = jasmine.createSpyObj<MatSnackBar>('SnackBar', ['open']);
    snackBar.open.and.returnValue(snackBarRef);
    const dialogRef = jasmine.createSpyObj<MatDialogRef<AlertDialogComponent>>('DialogRef', ['afterClosed']);
    dialogRef.afterClosed.and.returnValue(of('confirm'));
    const dialog = jasmine.createSpyObj<MatDialog>('Dialog', ['open']);
    dialog.open.and.returnValue(dialogRef);

    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: auth },
      { provide: MatSnackBar, useValue: snackBar },
    ] });
    http = TestBed.inject(HttpTestingController);
    component = new ConnectorConfigsComponent(TestBed.inject(DxLocationApiService), dialog, snackBar);
    component.elements = [element] as never[];
  });

  afterEach(() => {
    http.verify();
    action.complete();
  });

  function deleteRequest() {
    component.delete(element);
    return http.expectOne((request) => request.method === 'DELETE' && request.url.endsWith('/connectorConfigs/config-1'));
  }

  for (const status of [401, 403]) {
    it(`retains the item and login action when deletion returns ${status}`, () => {
      deleteRequest().flush({ message: { message: 'Not authorized' } }, { status, statusText: 'Denied' });
      expect(component.elements as unknown[]).toEqual([element]);
      // A generic component snackbar must not replace the working Login action.
      expect(snackBar.open).toHaveBeenCalledOnceWith('Not authorized', 'Login', { panelClass: ['red-snackbar'] });
      action.next();
      expect(auth.login).toHaveBeenCalledTimes(1);
    });
  }

  it('retains the item and shows a readable network error', () => {
    deleteRequest().error(new ProgressEvent('error'));
    expect(component.elements as unknown[]).toEqual([element]);
    expect(snackBar.open).toHaveBeenCalledOnceWith('ERROR: Could not connect to the server. Please try again.', 'x', { panelClass: ['red-snackbar'] });
  });

  it('removes the item only after successful deletion', () => {
    deleteRequest().flush(null);
    expect(component.elements).toEqual([]);
    expect(auth.login).not.toHaveBeenCalled();
  });
});
