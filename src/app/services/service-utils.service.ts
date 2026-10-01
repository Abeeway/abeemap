import { Injectable } from '@angular/core';

import { Observable, take, throwError } from 'rxjs';
import { MatSnackBar} from '@angular/material/snack-bar';

import { AuthService } from '../auth/auth.service';

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object'
    ? value as Record<string, unknown> : undefined;
}

export function isAuthenticationError(error: unknown): boolean {
  const status = record(error)?.['status'];
  return status === 401 || status === 403;
}

export function getApiErrorMessage(error: unknown): string {
  const response = record(error);
  const body = response?.['error'];
  const details = record(body);
  const message = details?.['message'];
  const candidates = [
    details?.['error_description'],
    record(message)?.['message'],
    message,
    typeof body === 'string' ? body : undefined,
    details?.['error'],
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  if (response?.['status'] === 0) return 'Could not connect to the server. Please try again.';
  if (response?.['status'] === 401) return 'Authentication required. Please sign in.';
  if (response?.['status'] === 403) return 'Access denied. Check your account permissions.';
  if (typeof response?.['message'] === 'string') return response['message'];
  if (typeof error === 'string' && error.trim()) return error;
  return 'The request failed. Please try again.';
}

@Injectable({
  providedIn: 'root'
})
export class ServiceUtilsService {

  constructor(
    private snackBar: MatSnackBar,
    private authService: AuthService,
  ) { }

  handleError<T>(operation = 'operation') {
    return (error: unknown): Observable<T> => {
      const message = getApiErrorMessage(error);
      console.error(`${operation} failed: ${message}`);

      if (isAuthenticationError(error)) {

        this.snackBar.open(
          message,
          'Login',
          { panelClass: ['red-snackbar'] },
        )
          .onAction().pipe(take(1)).subscribe(() => {
            this.authService.deleteSession();
            this.authService.login();
          });
      }
      // Preserve the original HttpErrorResponse, including status and body, for
      // callers. Failed mutations must never emit a success value.
      return throwError(() => error);
    };
  }

  log(message: string) {
    this.snackBar.open(message, '', {
      panelClass: ['green-snackbar'],
      duration: 3000,
    });
    // console.log(message);
  }

}
