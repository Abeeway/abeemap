import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface DialogData {
  title: string;
  inputText: string;
}

@Component({
    selector: 'app-textarea-dialog',
    templateUrl: './textarea-dialog.component.html',
    styleUrls: ['./textarea-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class TextareaDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<TextareaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onClear() {
    this.data.inputText = '';
  }

  onSave() {
    let a = document.createElement("a");
    a.href = window.URL.createObjectURL(new Blob([this.data.inputText], {type: "text/plain"}));
    a.download = "bluetooth_map.geojson";
    a.click(); 
  }

  async onFileSelected(event: any) {
    let file = event.target.files[0];

    if (file) {

      this.data.inputText = await file.text();
    }

  }

}
