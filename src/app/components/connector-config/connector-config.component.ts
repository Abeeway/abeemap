import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatSnackBar} from '@angular/material/snack-bar';

import { DxLocationApiService } from '../../services/dx-location-api.service';
import { getApiErrorMessage, isAuthenticationError } from '../../services/service-utils.service';

import { CONFIG } from '../../../environments/environment';

@Component({
    selector: 'app-connector-config',
    templateUrl: './connector-config.component.html',
    styleUrls: ['./connector-config.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ConnectorConfigComponent implements OnInit {

  formTypeIsCreate = false;

  dismissibleAlert = true;

  connectorConfig = {
    ref: '',
    applicationServerURL: 'https://example.com',
    deviceEUIList: '*',
  };

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private snackBar: MatSnackBar,
    private dxLocationApiService: DxLocationApiService,
  ) { }

  ngOnInit(): void {
    const ref = this.route.snapshot.paramMap.get('ref');
    if (ref === 'create') {
      this.formTypeIsCreate = true;
    } else if (ref) {
      this.formTypeIsCreate = false;
      // TODO: To show loading image!!
      this.get(ref);
    }
  }

  get(ref:string) {
    this.dxLocationApiService.getConnectorConfig(ref).subscribe(
      (data) => {
        this.connectorConfig = data;
        // this.reportSuccess(data.message.message);
        // this.goBack();
      },
      (error) => {
        this.reportError(error);
      }
    );
  }

  create() {

    this.dxLocationApiService.createConnectorConfig(this.connectorConfig).subscribe(
      (data) => {
        // this.reportSuccess(data.message.message);
        // this.goBack();
      },
      (error) => {
        this.reportError(error);
      }
    );

  }

  save() {

    this.dxLocationApiService.updateConnectorConfig(this.connectorConfig.ref, this.connectorConfig).subscribe(
      (data) => {
        // this.reportSuccess(data.message.message);
        // this.goBack();
      },
      (error) => {
        this.reportError(error);
      }
    );

  }

  goBack(): void {
    this.location.back();
  }

  reportError(error:any) {
    // The API error handler owns the authentication snackbar and its action.
    if (isAuthenticationError(error)) return;
    this.snackBar.open(
      'ERROR: ' + getApiErrorMessage(error),
      'x', {
        panelClass: ['red-snackbar'],
      }
    );       
  }

}
