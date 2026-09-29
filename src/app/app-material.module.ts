import { NgModule } from '@angular/core';
// import { CommonModule } from '@angular/common';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';

import { MatCheckboxModule } from '@angular/material/checkbox';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';

import {MatSlideToggleModule} from '@angular/material/slide-toggle';

import {ClipboardModule} from '@angular/cdk/clipboard';

import {MatExpansionModule} from '@angular/material/expansion';

import { MatTooltipModule } from '@angular/material/tooltip';

import { MatStepperModule } from '@angular/material/stepper';


const modules = [
    // CommonModule,

    MatToolbarModule,
    MatButtonModule,
    MatRadioModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,

    MatCardModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatMenuModule,

    MatCheckboxModule,

    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,

    MatSnackBarModule,
    MatDialogModule,

    MatSlideToggleModule,
    
    ClipboardModule,

    MatExpansionModule,

    MatTooltipModule,

    MatStepperModule,

];

@NgModule({
  declarations: [],
  imports: [...modules],
  exports: [...modules],
})
export class AppMaterialModule { }
