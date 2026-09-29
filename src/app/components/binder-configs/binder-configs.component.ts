import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar} from '@angular/material/snack-bar';

import { AlertDialogComponent } from '../alert-dialog/alert-dialog.component';
import { DxLocationApiService } from '../../services/dx-location-api.service';

@Component({
    selector: 'app-binder-configs',
    templateUrl: './binder-configs.component.html',
    styleUrls: ['./binder-configs.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class BinderConfigsComponent implements OnInit {


  isLoading = true;
  elements = [];

  componentTitle = 'Network Server Connections';


  elementName = 'binderConfig';
  elementIdPropertyName = 'ref';
  elementsRouteName = 'binder-configs';
  // elementPropertyName = 'ref';

  displayedColumns: string[] = [
    // 'ref', 
    'callbackURL', 
    // 'deviceEUIList', 
    'tools'
  ];

  constructor(
    private dxCoreApiService: DxLocationApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    // this.getBinderConfigs();
    this.get();
  }

  get(): void {
    this.isLoading = true;
    this.dxCoreApiService.getBinderConfigs().subscribe(
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

        this.dxCoreApiService.deleteBinderConfig(element[this.elementIdPropertyName]).subscribe(
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
    this.snackBar.open(
      'ERROR: ' + JSON.stringify(error.error),
      'x', {
        panelClass: ['red-snackbar'],
      }
    );       
  }

}
