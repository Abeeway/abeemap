import { Injectable } from '@angular/core';

import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable ,  of, throwError, } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { CONFIG } from '../../environments/environment';
import { ServiceUtilsService } from './service-utils.service';
// import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class DxAdminApiService {

  constructor(
    private http: HttpClient,
    private serviceUtils: ServiceUtilsService,
    // private authService: AuthService,
  ) { }

  getToken(grantType:string, clientId:string, clientSecret:string, renewToken:boolean, validityPeriod:string, platform:string): Observable<any> {

    /*
    return of({
      access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6WyJTVUJTQ1JJQkVSOjEzMjgzOCJdL'
      + 'CJleHAiOjE1OTQ3OTUwOTcsImp0aSI6IjA2M2YxOGM4LTJmYTUtNGE4MS1iOTY5LWM4Y2U5MDFmYmY5ZCIsImNsaWVudF'
      + '9pZCI6ImNvbW11bml0eS1hcGkvbm9yYmVydC5oZXJiZXJ0K2NvbW11bml0eUBhY3RpbGl0eS5jb20ifQ.cJCoHTZQtjG'
      + 'jfquCkDEw-O0fxhsA1ZoE0hvv8OQX--QRYIsiY1uSXdIDlSiI5hzniQu9Q90K9IZb5lR0aphSww'
    });
    */

    const formData = '' +
      'grant_type=' + encodeURIComponent(grantType) +
      '&client_id=' + encodeURIComponent(clientId) +
      '&client_secret=' + encodeURIComponent(clientSecret);

    const h = new HttpHeaders()
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json');
    const p = new HttpParams()
      .set('renewToken', encodeURIComponent(renewToken))
      .set('validityPeriod', encodeURIComponent(validityPeriod));

    return this.http.post<any>(
      `${CONFIG[platform].API_BASE_URL}/admin/latest/api/oauth/token`,
      formData,
      { params: p, headers: h }
    )
      .pipe(
        tap(_ => this.serviceUtils.log(`Token has been retreived for ${clientId}`)),
        catchError(this.serviceUtils.handleError<any>('getToken'))
      );

  }

}
