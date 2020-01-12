import {Component, OnInit} from '@angular/core';
import {Configuration} from '../../projects/angular-map-editor/src/models/configuration';
import {MatCheckboxChange, MatRadioChange} from '@angular/material';
import {ConfigProvider} from './config.provider';
import * as _ from 'lodash';
@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    public configuration: Configuration;
    public roles: string[] = ['viewer'];
    public logs: string[] = [];

    constructor(private configs: ConfigProvider) {

    }

    public ngOnInit(): void {
        // const configStr = localStorage.getItem('map-editor-config');
        // if (configStr) {
        //     this.configuration = JSON.parse(configStr);
        // }
    }


    public onConfigSaved(config: Configuration): void {
        // localStorage.setItem('map-editor-config', JSON.stringify(config));
        // console.log(config);
        this.log('[Event] Configuration saved');
    }

    public onRoleSet(role: string, { checked: checked }: MatCheckboxChange): void {
        if (checked) {
            this.roles = [...this.roles];
            this.roles.push(role);
        } else {
            this.roles.splice(this.roles.indexOf(role), 1);
            this.roles = [...this.roles];
        }

        this.log(`[Event] Roles set: ${this.roles.map(r => `"${r}" `).join(',')}`);
    }

    public onConfigSet(id: number, { value: value }: MatRadioChange): void {
        if (id === 0) {
            this.configuration = this.configs.minimalConfig;
            this.log(`[Event] Configuration changed to MinimalConfig`);
        } else {
            this.configuration = this.configs.colorfulConfig;
            this.log(`[Event] Configuration changed to ColorfulConfig`);
        }
    }

    private log(msg: string): void {
        this.logs.push(msg);
        if (this.logs.length > 100) {
            this.logs.splice(0, 1);
        }
    }
}
