import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar} from '@angular/material/snack-bar';

import { AlertDialogComponent } from '../alert-dialog/alert-dialog.component';
import { DxLocationApiService } from '../../services/dx-location-api.service';
import { getApiErrorMessage, isAuthenticationError } from '../../services/service-utils.service';

@Component({
    selector: 'app-connector-configs',
    templateUrl: './connector-configs.component.html',
    styleUrls: ['./connector-configs.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ConnectorConfigsComponent implements OnInit {

  isLoading = true;
  elements = [];

  componentTitle = 'App Server Connections';

  elementName = 'connectorConfig';
  elementIdPropertyName = 'ref';
  elementsRouteName = 'connector-configs';
  // elementPropertyName = 'ref';

  displayedColumns: string[] = [
    // 'ref', 
    'applicationServerURL', 
    // 'deviceEUIList', 
    'tools'
  ];

  constructor(
    private dxCoreApiService: DxLocationApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.get();
  }

  get(): void {
    this.isLoading = true;
    this.dxCoreApiService.getConnectorConfigs().subscribe(
      (data) => {
        this.isLoading = false;
        this.elements = data;
        // alert(JSON.stringify(data, null, 4));
      },
      (error) => {
        this.isLoading = false;
        this.elements = [];
        this.reportError(error);
      }
    );
  }

  delete(element:any): void {

    const dialogRef = this.dialog.open(AlertDialogComponent, {
      data: {
        title: 'Delete?',
        message: `Do you really want to delete this item? ${element[this.elementIdPropertyName]}` },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'confirm') {

        this.dxCoreApiService.deleteConnectorConfig(element[this.elementIdPropertyName]).subscribe(
          (data) => {
            this.elements = this.elements.filter(u => u !== element);
            // this.reportSuccess(data.message.message);
          },
          (error) => {
            this.reportError(error);
          }
        );

      }
    });

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
