import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatCardModule, MatCheckboxModule, MatIconModule, MatRadioModule, MatToolbarModule} from '@angular/material';
import {MapEditorModule} from '../../projects/angular-map-editor/src/map-editor.module';
import {ConfigProvider} from './config.provider';

@NgModule({
    declarations: [
        AppComponent
    ],
    imports: [
        FlexLayoutModule,
        BrowserModule,
        BrowserAnimationsModule,
        MatToolbarModule,
        MatCardModule,
        MatCheckboxModule,
        MatRadioModule,
        MatIconModule,
        MapEditorModule
    ],
    providers: [ConfigProvider],
    bootstrap: [AppComponent]
})
export class AppModule {
}
