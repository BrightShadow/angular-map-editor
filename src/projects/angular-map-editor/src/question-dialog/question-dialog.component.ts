import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';

@Component({
    selector: 'so-question-dialog',
    templateUrl: './question-dialog.component.html',
    styleUrls: ['./question-dialog.component.css']
})
export class QuestionDialogComponent implements OnInit {

    constructor(
        public dialogRef: MatDialogRef<QuestionDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DialogData) {
    }

    public onNoClick(): void {
        this.dialogRef.close(false);
    }

    ngOnInit() {
    }

}


export interface DialogData {
    title: string;
    message: string;
}
