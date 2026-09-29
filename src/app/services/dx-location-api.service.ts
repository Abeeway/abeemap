import { Injectable } from '@angular/core';

import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable , of, throwError, } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { CONFIG } from '../../environments/environment';
import { ServiceUtilsService } from './service-utils.service';
import { AuthService } from '../auth/auth.service';


@Injectable({
  providedIn: 'root'
})
export class DxLocationApiService {

  constructor(
    private http: HttpClient,
    private serviceUtils: ServiceUtilsService,
    private authService: AuthService,
  ) { 
  }

  getBluetoothMap(): Observable<any> {

    const h = new HttpHeaders()
      .set('Accept', '*/*');

    const url = `${CONFIG[this.authService.platform].API_BASE_URL}/location-alarm-config/latest/api/bluetoothMap`;

    return this.http.get<any>( url, { headers: h } )
      .pipe(
//        map( array => {
//            return array.filter( (element:any) => {
//              return element.EUI.startsWith('20635F');
//            });
//        }),
        tap(_ => this.serviceUtils.log(`The bluetooth map has been retreived`)),
        catchError(this.serviceUtils.handleError<any>('getBluetoothMap'))
      );

  }

  setBluetoothMap(features:any): Observable<any> {

    const h = new HttpHeaders()
      .set('Accept', 'application/json');

    const featuresText = JSON.stringify(features);
    const featuresTextBlob = new Blob([featuresText], {type: 'application/geo+json'});
    // const featuresTextBlob = new Blob([featuresText]);

    const formData = new FormData();
    formData.append('file', featuresTextBlob);

    return this.http.post<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location-alarm-config/latest/api/bluetoothMap`,
      formData,
      {
        headers: h
      }
    )
      .pipe(
//        map( array => {
//            return array.filter( (element:any) => {
//              return element.EUI.startsWith('20635F');
//            });
//        }),
        tap(_ => this.serviceUtils.log(`The bluetooth map has been saved`)),
        catchError(this.serviceUtils.handleError<any>('setBluetoothMap'))
      );

  }

  deleteBluetoothMap(): Observable<any> {

    const h = new HttpHeaders()
      .set('Accept', 'application/json');

    return this.http.delete<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location-alarm-config/latest/api/bluetoothMap`,
      {
        headers: h
      }
    )
      .pipe(
//        map( array => {
//            return array.filter( (element:any) => {
//              return element.EUI.startsWith('20635F');
//            });
//        }),
        tap(_ => this.serviceUtils.log(`The bluetooth map has been deleted`)),
        catchError(this.serviceUtils.handleError<any>('deleteBluetoothMap'))
      );

  }

  getConnectorConfigs() {
    // curl -X GET "https://dx-api.preview.thingpark.com/location-connector/latest/api/connectorConfigs" -H "accept: application/json"

    const h = new HttpHeaders()
      .set('accept', 'application/json');

    return this.http.get<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location-connector/latest/api/connectorConfigs`,
      {
        headers: h
      }
    )
      .pipe(
//        map( array => {
//            return array.filter( (element:any) => {
//              return element.EUI.startsWith('20635F');
//            });
//        }),
        tap(_ => this.serviceUtils.log(`Connector Configs have been retreived`)),
        catchError(this.serviceUtils.handleError<any>('getConnectorConfigs'))
      );

  }

  getConnectorConfig(ref:string) {
    return this.http.get<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location-connector/latest/api/connectorConfigs/${ref}`,
    )
      .pipe(
        tap(_ => this.serviceUtils.log(`Connector Config has been retrieved!`)),
        catchError(this.serviceUtils.handleError<any>('getConnectorConfig'))
      );
  }


  deleteConnectorConfig(ref:string) {

    return this.http.delete<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location-connector/latest/api/connectorConfigs/${ref}`,
    )
      .pipe(
        tap(_ => this.serviceUtils.log(`The selected Connector Config has been deleted!`)),
        catchError(this.serviceUtils.handleError<any>('deleteConnectorConfig'))
      );

  }

  createConnectorConfig(connectorConfig:any) {

    if ('ref' in connectorConfig) {
      delete connectorConfig.ref;
    }

    const h = new HttpHeaders()
      .set('accept', 'application/json')
      .set('content-type', 'application/json');

    return this.http.post<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location-connector/latest/api/connectorConfigs`,
      connectorConfig,
      {
        headers: h
      }
    )
      .pipe(
//        map( array => {
//            return array.filter( (element:any) => {
//              return element.EUI.startsWith('20635F');
//            });
//        }),
        tap(_ => this.serviceUtils.log(`Connector Config has been created`)),
        catchError(this.serviceUtils.handleError<any>('createConnectorConfig'))
      );

  }


  updateConnectorConfig(ref:string, connectorConfig:any) {

    // if ('ref' in connectorConfig) {
    //   delete connectorConfig.ref;
    // }

    const h = new HttpHeaders()
      .set('accept', 'application/json')
      .set('content-type', 'application/json');

    return this.http.put<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location-connector/latest/api/connectorConfigs/${ref}`,
      connectorConfig,
      {
        headers: h
      }
    )
      .pipe(
//        map( array => {
//            return array.filter( (element:any) => {
//              return element.EUI.startsWith('20635F');
//            });
//        }),
        tap(_ => this.serviceUtils.log(`Connector Config has been updated`)),
        catchError(this.serviceUtils.handleError<any>('updateConnectorConfig'))
      );

  }












  getBinderConfigs() {
    // curl -X GET "https://dx-api.preview.thingpark.com/location/latest/api/binderConfigs" -H "accept: application/json"

    const h = new HttpHeaders()
      .set('accept', 'application/json');

    return this.http.get<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location/latest/api/binderConfigs`,
      {
        headers: h
      }
    )
      .pipe(
//        map( array => {
//            return array.filter( (element:any) => {
//              return element.EUI.startsWith('20635F');
//            });
//        }),
        tap(_ => this.serviceUtils.log(`Binder Configs have been retreived`)),
        catchError(this.serviceUtils.handleError<any>('getBinderConfigs'))
      );

  }


  getBinderConfig(ref:string) {
    return this.http.get<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location/latest/api/binderConfigs/${ref}`,
    )
      .pipe(
        tap(_ => this.serviceUtils.log(`Connector Config has been retrieved!`)),
        catchError(this.serviceUtils.handleError<any>('getBinderConfig'))
      );
  }


  deleteBinderConfig(ref:string) {

    return this.http.delete<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location/latest/api/binderConfigs/${ref}`,
    )
      .pipe(
        tap(_ => this.serviceUtils.log(`The selected Connector Config has been deleted!`)),
        catchError(this.serviceUtils.handleError<any>('deleteBinderConfig'))
      );

  }

  createBinderConfig(binderConfig:any) {

    if ('ref' in binderConfig) {
      delete binderConfig.ref;
    }

    const h = new HttpHeaders()
      .set('accept', 'application/json')
      .set('content-type', 'application/json');

    return this.http.post<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location/latest/api/binderConfigs`,
      binderConfig,
      {
        headers: h
      }
    )
      .pipe(
//        map( array => {
//            return array.filter( (element:any) => {
//              return element.EUI.startsWith('20635F');
//            });
//        }),
        tap(_ => this.serviceUtils.log(`Connector Config has been created`)),
        catchError(this.serviceUtils.handleError<any>('createConnectorConfig'))
      );

  }


  updateBinderConfig(ref:string, binderConfig:any) {

    // if ('ref' in binderConfig) {
    //   delete binderConfig.ref;
    // }

    const h = new HttpHeaders()
      .set('accept', 'application/json')
      .set('content-type', 'application/json');

    return this.http.put<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location/latest/api/binderConfigs/${ref}`,
      binderConfig,
      {
        headers: h
      }
    )
      .pipe(
//        map( array => {
//            return array.filter( (element:any) => {
//              return element.EUI.startsWith('20635F');
//            });
//        }),
        tap(_ => this.serviceUtils.log(`Connector Config has been updated`)),
        catchError(this.serviceUtils.handleError<any>('updateConnectorConfig'))
      );

  }









  getAPIKeys() {

    const h = new HttpHeaders()
      .set('accept', 'application/json');

    return this.http.get<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location-key-management/latest/api/apiKeys`,
      // CONFIG[this.authService.platform].APIKEY_MGMT_URL,
      {
        headers: h
      }
    )
      .pipe(
        tap(_ => this.serviceUtils.log(`API Keys have been retreived`)),
        catchError(this.serviceUtils.handleError<any>('getAPIKeys'))
      );

  }


  getAPIKey(ref:string) {
    return this.http.get<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location-key-management/latest/api/apiKeys/${ref}`,
      // `${CONFIG[this.authService.platform].APIKEY_MGMT_URL}/${ref}`,
    )
      .pipe(
        tap(_ => this.serviceUtils.log(`API Key has been retrieved!`)),
        catchError(this.serviceUtils.handleError<any>('getAPIKey'))
      );
  }


  deleteAPIKey(ref:string) {

    return this.http.delete<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location-key-management/latest/api/apiKeys/${ref}`,
      // `${CONFIG[this.authService.platform].APIKEY_MGMT_URL}/${ref}`,
    )
      .pipe(
        tap(_ => this.serviceUtils.log(`The selected API Key has been deleted!`)),
        catchError(this.serviceUtils.handleError<any>('deleteAPIKey'))
      );

  }

  createAPIKey(apiKey:any) {

    if ('ref' in apiKey) {
      delete apiKey.ref;
    }

    const h = new HttpHeaders()
      .set('accept', 'application/json')
      .set('content-type', 'application/json');

    return this.http.post<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location-key-management/latest/api/apiKeys`,
      // CONFIG[this.authService.platform].APIKEY_MGMT_URL,
      apiKey,
      {
        headers: h
      }
    )
      .pipe(
        tap(_ => this.serviceUtils.log(`API Key has been created`)),
        catchError(this.serviceUtils.handleError<any>('createAPIKey'))
      );

  }

  resetAPIKey(apiKeyId:string) {

    const h = new HttpHeaders()
      .set('accept', 'application/json');

    return this.http.put<any>(
      `${CONFIG[this.authService.platform].API_BASE_URL}/location-key-management/latest/api/apiKeys/${apiKeyId}`,
      // `${CONFIG[this.authService.platform].APIKEY_MGMT_URL}/${apiKeyId}`,
      {},
      {
        headers: h
      }
    )
      .pipe(
        tap(_ => this.serviceUtils.log(`Connector Config has been reset`)),
        catchError(this.serviceUtils.handleError<any>('resetAPIKey'))
      );

  }


}