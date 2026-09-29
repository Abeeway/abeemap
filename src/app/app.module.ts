import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
  withXhr,
} from '@angular/common/http';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppMaterialModule } from './app-material.module';
import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
import { NavigationComponent } from './components/navigation/navigation.component';
import { ConnectorConfigsComponent } from './components/connector-configs/connector-configs.component';
import { BinderConfigsComponent } from './components/binder-configs/binder-configs.component';
import { UserComponent } from './components/user/user.component';
import { LoginComponent } from './components/login/login.component';
import { BeaconSettingsPopupComponent } from './components/beacon-settings-popup/beacon-settings-popup.component';
import { TextareaDialogComponent } from './components/textarea-dialog/textarea-dialog.component';
import { IntegrationsComponent } from './components/integrations/integrations.component';
import { AlertDialogComponent } from './components/alert-dialog/alert-dialog.component';
import { PopupDialogComponent } from './components/popup-dialog/popup-dialog.component';
import { BinderConfigComponent } from './components/binder-config/binder-config.component';
import { ConnectorConfigComponent } from './components/connector-config/connector-config.component';
import { ApiKeyComponent } from './components/api-key/api-key.component';
import { ApiKeysComponent } from './components/api-keys/api-keys.component';

import { AuthInterceptor } from './auth/auth.interceptor';
import { LogsComponent } from './components/logs/logs.component';

import { MqttClientService } from './services/mqtt-client.service';
import { LogsService } from './services/logs.service';

import { CONFIG } from '../environments/environment';

@NgModule({
  declarations: [
    AppComponent,
    NavigationComponent,
    HomeComponent,
    ConnectorConfigsComponent,
    BinderConfigsComponent,
    UserComponent,
    LoginComponent,
    BeaconSettingsPopupComponent,
    TextareaDialogComponent,
    IntegrationsComponent,
    AlertDialogComponent,
    PopupDialogComponent,
    BinderConfigComponent,
    ConnectorConfigComponent,
    ApiKeysComponent,
    ApiKeyComponent,
    LogsComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    AppMaterialModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: APP_INITIALIZER, useFactory: initFunction, deps: [MqttClientService], multi: true },
    { provide: APP_INITIALIZER, useFactory: initFunction, deps: [LogsService], multi: true },
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }

export function initFunction(service: MqttClientService|LogsService)
{
  if(sessionStorage.getItem('access_token_' + CONFIG.client_id)) {
    return () => service.ngOnInit();
  } else {
    return () => {}
  }
}
