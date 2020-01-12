import {NgModule} from '@angular/core';
import {MapEditorComponent} from './map-editor/map-editor.component';
import {MapEditorService} from './services/map-editor.service';
import {ObjectsProviderService} from './services/objects-provider.service';
import {EditorLayersService} from './services/editor-layers.service';
import {BrowserModule} from '@angular/platform-browser';
import {MathematicsService} from './services/mathematics.service';
import {AssetsProviderService} from './services/assets-provider.service';
import {SafePipe} from './pipes/safe.pipe';
import {MatButtonModule, MatDialogModule, MatProgressSpinnerModule, MatTooltipModule} from '@angular/material';
import {AssetPipe} from './pipes/asset.pipe';
import {ConfigService} from './services/config.service';
import {HttpClientModule} from '@angular/common/http';
import {FilesService} from './services/files.service';
import { QuestionDialogComponent } from './question-dialog/question-dialog.component';
import { FloatingToolbarComponent } from './floating-toolbar/floating-toolbar.component';
import { FloatingButtonComponent } from './floating-toolbar/floating-button/floating-button.component';
import {PermissionsService} from './services/permissions.service';

@NgModule({
    providers: [
        ConfigService,
        MapEditorService,
        ObjectsProviderService,
        EditorLayersService,
        MathematicsService,
        AssetsProviderService,
        FilesService,
        PermissionsService
    ],
    declarations: [
        MapEditorComponent,
        SafePipe,
        AssetPipe,
        QuestionDialogComponent,
        FloatingToolbarComponent,
        FloatingButtonComponent
    ],
    imports: [
        BrowserModule,
        MatButtonModule,
        MatTooltipModule,
        HttpClientModule,
        MatDialogModule,
        MatProgressSpinnerModule
    ],
    exports: [MapEditorComponent],
    entryComponents: [QuestionDialogComponent]
})
export class MapEditorModule {
}
