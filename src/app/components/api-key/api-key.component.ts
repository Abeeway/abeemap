import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { MatSnackBar} from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { DxLocationApiService } from '../../services/dx-location-api.service';

import { PopupDialogComponent } from '../popup-dialog/popup-dialog.component';

// import { CONFIG } from '../../../environments/environment';

@Component({
    selector: 'app-api-key',
    templateUrl: './api-key.component.html',
    styleUrls: ['./api-key.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ApiKeyComponent implements OnInit {

  formTypeIsCreate = false;

  dismissibleAlert = true;

  apiKey:{id?:string, scope:string, name:string} = {
    id: '',
    scope: 'ALL',
    name: '',
  };

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private snackBar: MatSnackBar,
    private dxLocationApiService: DxLocationApiService,
    private dialog: MatDialog,
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
    this.dxLocationApiService.getAPIKey(ref).subscribe(
      (data) => {
        this.apiKey = data;
        // this.reportSuccess(data.message.message);
        // this.goBack();
      },
      (error) => {
        this.reportError(error);
      }
    );
  }

  create() {

    delete this.apiKey.id;
    this.dxLocationApiService.createAPIKey(this.apiKey).subscribe(
      (data) => {
        // this.reportSuccess(data.message.message);
        // this.goBack();

        const dialogRef = this.dialog.open(PopupDialogComponent, {
          data: {
            title: 'API Key Created',
            message: data.apiKey,
            message2: `Please record this API Key so that you can use it later to authenticate your applications. This key won't be shown again throu this graphical user interface.`
          }
        });

      },
      (error) => {
        this.reportError(error);
      }
    );

  }

  reset() {
    if (this.apiKey.id) {
      this.dxLocationApiService.resetAPIKey(this.apiKey.id).subscribe(
        (data) => {
          // this.reportSuccess(data.message.message);
          // this.goBack();

          const dialogRef = this.dialog.open(PopupDialogComponent, {
            data: {
              title: 'API Key Reset',
              message: data.apiKey,
              message2: `Please record this API Key so that you can use it later to authenticate your applications. This key won't be shown again throu this graphical user interface.`
            }
          });

        },
        (error) => {
          this.reportError(error);
        }
      );
    }
  }

  goBack(): void {
    this.location.back();
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