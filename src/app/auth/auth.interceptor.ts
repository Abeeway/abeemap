import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthService } from './auth.service';
import { CONFIG } from '../../environments/environment';


@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, @Inject(DOCUMENT) private document: Document) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    const token = this.authService.isAuthenticated() ? this.authService.token : undefined;

    if (token && this.isSelectedApiRequest(request.url)) {
      request = request.clone({
        headers: request.headers.set('Authorization', 'Bearer ' + token),
      });
    }

    return next.handle(request);
  }

  private isSelectedApiRequest(requestUrl: string): boolean {
    const platform = this.authService.platform;
    if (!['ECODX', 'ECOKC', 'PREVDX', 'PREVKC'].includes(platform)) return false;
    const baseUrl: unknown = CONFIG[platform]?.API_BASE_URL;
    if (typeof baseUrl !== 'string') return false;

    try {
      const base = new URL(baseUrl);
      const url = new URL(requestUrl, this.document.baseURI);
      const basePath = base.pathname.replace(/\/+$/, '');
      return ['http:', 'https:'].includes(base.protocol)
        && url.origin === base.origin
        && !url.username && !url.password
        && (url.pathname === basePath || url.pathname.startsWith(`${basePath}/`));
    } catch {
      return false;
    }
  }
}
