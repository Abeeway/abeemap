import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar} from '@angular/material/snack-bar';

import { AlertDialogComponent } from '../alert-dialog/alert-dialog.component';
import { DxLocationApiService } from '../../services/dx-location-api.service';
import { getApiErrorMessage, isAuthenticationError } from '../../services/service-utils.service';

@Component({
    selector: 'app-api-keys',
    templateUrl: './api-keys.component.html',
    styleUrls: ['./api-keys.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ApiKeysComponent implements OnInit {
  isLoading = true;
  elements = [];

  componentTitle = 'API Keys';

  elementName = 'apiKey';
  elementIdPropertyName = 'id';
  elementsRouteName = 'api-keys';
  // elementPropertyName = 'ref';

  displayedColumns: string[] = [
    'id', 
    'name',
    'scope', 
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
    this.dxCoreApiService.getAPIKeys().subscribe(
      (data) => {
        this.isLoading = false;
        this.elements = data;
        // console.log(JSON.stringify(data, null, 4));
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

        this.dxCoreApiService.deleteAPIKey(element[this.elementIdPropertyName]).subscribe(
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
