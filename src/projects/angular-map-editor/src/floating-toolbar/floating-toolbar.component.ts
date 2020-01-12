import {AfterViewInit, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {AssetsProviderService} from '../services/assets-provider.service';
import {ConfigService} from '../services/config.service';
import {ToolbarItemSettings} from '../models/configuration';
import {zip} from 'rxjs';

@Component({
    selector: 'so-floating-toolbar',
    templateUrl: './floating-toolbar.component.html',
    styleUrls: ['./floating-toolbar.component.css']
})
export class FloatingToolbarComponent implements OnInit, AfterViewInit {

    private static innerId = 1;

    public innerId: string;

    @Input()
    public posLeft = 0;

    @Input()
    public posTop = 0;

    @Input()
    public items: ToolbarItemSettings[];

    @Output()
    public itemClick = new EventEmitter<string>();

    constructor() {
        const id = ++FloatingToolbarComponent.innerId;
        this.innerId = `ft-${id}-`;
    }

    public ngOnInit(): void {
    }

    public ngAfterViewInit(): void {
    }

    public onItemClick(item: ToolbarItemSettings, subToolbarId: string, isSubMenuItem: boolean = false, parentIndex: number = -1): void {
        if (item) {
            this.itemClick.emit(item.type);
            if (isSubMenuItem) {
                const subMenu = document.getElementById(subToolbarId) as HTMLElement;
                subMenu.style.display = 'none';
                this.items[parentIndex].icon = item.icon;
            }
        } else {
            const subMenu = document.getElementById(subToolbarId) as HTMLElement;
            if (subMenu.style.display === 'none') {
                subMenu.style.display = 'block';
            } else {
                subMenu.style.display = 'none';
            }
        }
    }

}
