import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

@Component({
    selector: 'so-floating-button',
    templateUrl: './floating-button.component.html',
    styleUrls: ['./floating-button.component.css']
})
export class FloatingButtonComponent implements OnInit {

    @Input()
    public caption: string;

    @Input()
    public iconFileName: string;

    @Input()
    public posLeft = 0;

    @Input()
    public posTop = 0;

    @Input()
    public posRight = 0;

    @Input()
    public posBottom = 0;

    @Input()
    public buttonColor = 'secondary';

    @Input()
    public isMiniButton = false;

    @Output()
    public buttonClick = new EventEmitter<any>();


    constructor() {
    }

    public ngOnInit(): void {
    }

    public onClick(): void {
        this.buttonClick.emit();
    }
}
