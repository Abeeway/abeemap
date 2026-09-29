import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './components/home/home.component';
import { IntegrationsComponent } from './components/integrations/integrations.component';
import { ConnectorConfigsComponent } from './components/connector-configs/connector-configs.component';
import { ConnectorConfigComponent } from './components/connector-config/connector-config.component';
import { BinderConfigsComponent } from './components/binder-configs/binder-configs.component';
import { BinderConfigComponent } from './components/binder-config/binder-config.component';
import { ApiKeyComponent } from './components/api-key/api-key.component';
import { LogsComponent } from './components/logs/logs.component';
import { UserComponent } from './components/user/user.component';
import { LoginComponent } from './components/login/login.component';

import { canActivate } from './auth/auth.guard';

const routes: Routes = [

  {
    path: 'home',
    component: HomeComponent,
    canActivate: [ canActivate ],
  },
  {
    path: 'map',
    loadComponent: () => import('./components/map/map.component').then((module) => module.MapComponent),
    canActivate: [ canActivate ],
  },
  {
    path: 'logs',
    component: LogsComponent,
    canActivate: [ canActivate ],
  },
  {
    path: 'bluetooth-map',
    loadComponent: () => import('./components/bluetooth-map/bluetooth-map.component').then((module) => module.BluetoothMapComponent),
    canActivate: [ canActivate ],
  },
  {
    path: 'integrations',
    component: IntegrationsComponent,
    canActivate: [ canActivate ],
  },
  // {
  //   path: 'integrations/:openedPanelIndex',
  //   component: IntegrationsComponent,
  //   canActivate: [ canActivate ],
  // },
  /*
  {
    path: 'connector-configs/create',
    component: ConnectorConfigComponent,
    canActivate: [ canActivate ],
  },
  */  
  {
    path: 'connector-configs/:ref',
    component: ConnectorConfigComponent,
    canActivate: [ canActivate ],
  },
  /*
  {
    path: 'binder-configs/create',
    component: BinderConfigComponent,
    canActivate: [ canActivate ],
  },
  */
  {
    path: 'binder-configs/:ref',
    component: BinderConfigComponent,
    canActivate: [ canActivate ],
  },
  {
    path: 'api-keys/:ref',
    component: ApiKeyComponent,
    canActivate: [ canActivate ],
  },
  {
    path: 'user',
    component: UserComponent,
    canActivate: [ canActivate ],
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    redirectTo: 'map',
    pathMatch: 'full',
    // canActivate: [ canActivate ],
  },
  {
    path: '#',
    redirectTo: 'map',
    pathMatch: 'full',
    // canActivate: [ canActivate ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  // providers: [ canActivate ]
})
export class AppRoutingModule { }
