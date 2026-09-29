import { Injectable } from '@angular/core';

import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable , of, throwError, forkJoin} from 'rxjs';
import { mergeMap} from 'rxjs/operators';
import { catchError, map, tap } from 'rxjs/operators';

import { CONFIG } from '../../environments/environment';
import { ServiceUtilsService } from './service-utils.service';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class DxCoreApiService {

  constructor(
    private http: HttpClient,
    private serviceUtils: ServiceUtilsService,
    private authService: AuthService,
  ) { }

  getDevices(): Observable<any> {

    const h = new HttpHeaders()
      .set('Accept', 'application/json');
    // const p = new HttpParams()
      // .set('renewToken', encodeURIComponent(renewToken))
      // .set('validityPeriod', encodeURIComponent(validityPeriod));

    return this.http.get<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/core/latest/api/devices`,
      {
        // params: p,
        headers: h
      }
    )
      .pipe(
        map( array => {
            return array.filter( (element:any) => {
              return element.EUI.startsWith('20635F');
            });
        }),
        tap(_ => this.serviceUtils.log(`Devices have been retreived`)),
        catchError(this.serviceUtils.handleError<any>('getDevices'))
      );

  }

  getGateways(): Observable<any> {

    const url = `${CONFIG[this.authService.platform].API_BASE_URL}/core/latest/api/baseStations`;
    const h = new HttpHeaders()
      .set('Accept', 'application/json');
    // const p = new HttpParams()
      // .set('renewToken', encodeURIComponent(renewToken))
      // .set('validityPeriod', encodeURIComponent(validityPeriod));

    return this.http
      .get<any>(
        url,
        { headers: h }
      )
      .pipe(
        mergeMap( (gateways: any) => forkJoin(
          gateways.map( (gateway: any) => this.http
            .get<any>(
              url + '/' + gateway.ref,
              { headers: h }
            )
          )
        )),
        tap(_ => this.serviceUtils.log('Gateways have been retrieved')),
        catchError(this.serviceUtils.handleError<any>('getGateways'))
      );

  }

  /* This format change is required for Open Layers */
  getGatewayFeatures(): Observable<any> {
    return this.getGateways()
      .pipe(
        map( (points: any) => {
          return {
            type: 'FeatureCollection',
            features: points.map( (point: any) => {
              return {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [point.statistics.lastGeoLongitude, point.statistics.lastGeoLatitude]
                },
                properties: {
                  name: point.name,
                  gatewayId: point.id,
                  text: `Gateway: ${point.name}; ${point.id}`,
                }
              };
            }),
          };
        }),
        tap(_ => this.serviceUtils.log('Gateways have been retrieved')),
        catchError(this.serviceUtils.handleError<any>('getGateways'))
      );
  }

}
