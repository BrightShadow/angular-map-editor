import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges,
    ViewChild
} from '@angular/core';
import {MapEditorService} from '../services/map-editor.service';
import * as _ from 'lodash';
import {AssetsProviderService} from '../services/assets-provider.service';
import {Configuration, EditorSettings, MapConfig, ToolbarItemSettings} from '../models/configuration';
import {ConfigService} from '../services/config.service';
import {FilesService} from '../services/files.service';
import {MatDialog} from '@angular/material';
import {DialogData, QuestionDialogComponent} from '../question-dialog/question-dialog.component';
import {Observable, zip} from 'rxjs';
import {Role} from '../models/role.enum';
import {map, tap} from 'rxjs/operators';
import {ObjectsProviderService} from '../services/objects-provider.service';

@Component({
    selector: 'so-map-editor', templateUrl: './map-editor.component.html', styleUrls: ['./map-editor.component.css']
})
export class MapEditorComponent implements OnInit, AfterViewInit, OnChanges {

    @ViewChild('downloadLink', {static: false}) downloadLink: ElementRef;

    /**
     * A full map editor configuration model.
     */
    @Input()
    public configuration: Configuration;

    /**
     * Defines user permissions inside this component.
     */
    @Input()
    public userRoles: Role[] = [
        Role.Viewer
    ];

    @Input()
    public margin = '0';

    /**
     * An event fired when user requested a configuration save.
     */
    @Output()
    public configurationSaved = new EventEmitter<Configuration>();

    public objectTypes: string[];
    public floorMapsDict: { [id: number]: MapConfig } = {};
    public floorMaps: MapConfig[];
    public currentFloorMap: MapConfig;
    public editorSettings: EditorSettings;
    public showConfigMenu = false;
    public isLoading = true;
    public visible = {
        objectsToolbar: true,
        adminToolbar: true,
        toolsToolbar: true,
        asideMarginSpace: true,
        floorsToolbar: true
    };
    public adminToolbarItems: Observable<ToolbarItemSettings[]>;
    public objectToolbarItems: Observable<ToolbarItemSettings[]>;
    private initialized = false;

    constructor(private service: MapEditorService,
                private assets: AssetsProviderService,
                private config: ConfigService,
                private files: FilesService,
                private objectsProvider: ObjectsProviderService,
                public dialog: MatDialog) {

        this.service.changed.subscribe(() => {
            this.onRolesUpdates(_.isNil(this.userRoles) ? [] : this.userRoles);
            this.isLoading = true;
            this.reloadConfig()
                .subscribe(() => {
                    setTimeout(() => this.isLoading = false, 200);
                });
        });


        this.adminToolbarItems = zip(assets.changed, config.changed, service.changed, objectsProvider.changed)
            .pipe(map(() => this.config.getEditorSettings().toolbar));

        this.objectToolbarItems = new Observable(o => {
            const item = <ToolbarItemSettings>{
                icon: 'icon-grid.png',
                caption: 'Editor tools',
                items: [
                    <ToolbarItemSettings>{
                        icon: 'icon-undo.png',
                        caption: 'Undo [Ctrl+Z]',
                        type: 'undo'
                    },
                    <ToolbarItemSettings>{
                        icon: 'icon-rotate-45.png',
                        caption: 'Rotate 45° [R]',
                        type: 'rotate45'
                    },
                    <ToolbarItemSettings>{
                        icon: 'icon-clear-canvas.png',
                        caption: 'Clear all [Del]',
                        type: 'clearAll'
                    },
                    <ToolbarItemSettings>{
                        icon: 'icon-grid.png',
                        caption: 'Toggle grid [G]',
                        type: 'toggleGrid'
                    },
                    <ToolbarItemSettings>{
                        icon: 'icon-bring-top.png',
                        caption: 'Bring to top ]',
                        type: 'bringTop'
                    },
                    <ToolbarItemSettings>{
                        icon: 'icon-bring-bottom.png',
                        caption: 'Bring to bottom [',
                        type: 'bringBottom'
                    },
                ]
            };
            o.next([item]);
            o.complete();
        });
    }

    public ngOnInit(): void {
        // load configuration from Input param
        if (this.configuration) {
            this.config.setConfig(this.configuration);
        } else {
            this.config.refresh();
        }
        this.initialized = true;
    }

    public ngAfterViewInit(): void {
        this.service.setReadOnlyMode(true);
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (!this.initialized) {
            return;
        }

        if (changes['userRoles']) {
            this.onRolesUpdates(changes['userRoles'].currentValue ? changes['userRoles'].currentValue as Role[] : []);
        }

        if (changes['configuration']) {
            const msg = this.config.setConfig(changes['configuration'].currentValue);
            if (msg.length > 0) {
                alert(msg);
            }
        }
    }

    public onObjectSelected(objectType: string): void {
        switch (objectType) {
            case 'undo':
                this.service.undo();
                break;
            case 'rotate45':
                this.service.rotate45();
                break;
            case 'clearAll':
                this.service.clear();
                break;
            case 'toggleGrid':
                this.service.toggleGrid();
                break;
            case 'bringTop':
                this.service.bringToTop();
                break;
            case 'bringBottom':
                this.service.bringToBottom();
                break;
            default:
                this.service.setActiveObject(objectType);
                break;
        }
    }

    public onConfigClick(): void {
        this.showConfigMenu = !this.showConfigMenu;
    }

    public onSaveConfigClick(): void {
        this.questionDialog(
            'Save configuration',
            `Are you sure to save whole maps editor configuration?`
        ).subscribe(result => {
            if (result) {
                this.updateLocalConfig();
                this.configurationSaved.emit(this.config.getConfig());
            }
        });
    }

    public onDownloadConfigClick(): void {
        this.questionDialog(
            'Download configuration as JSON',
            `Exporter needs to save current configuration first. Do you want to proceed?`
        ).subscribe(result => {
            if (result) {
                this.updateLocalConfig();
                this.files.saveJsonFile('map-editor-config.json', this.config.getConfig());
            }
        });
    }

    public onUploadConfigClick(): void {
        this.files.uploadJsonFile()
            .then(jsonConfig => {

                this.questionDialog(
                    'Upload configuration JSON file',
                    `Given file will replace whole maps configuration. Do you want to proceed?`
                ).subscribe(result => {
                    if (result) {
                        const msg = this.config.setConfig(JSON.parse(jsonConfig));
                        if (msg.length > 0) {
                            alert(msg);
                        }
                    }
                });
            });
    }

    public onUploadJsonMapClick(): void {

        this.files.uploadJsonFile()
            .then(jsonConfig => {
                const mapConfig = JSON.parse(jsonConfig) as MapConfig;
                this.questionDialog(
                    'Upload map JSON file',
                    `This data will replace a map of floor number ${mapConfig.id}. Do you want to proceed?`
                )
                    .subscribe(result => {
                        if (result) {
                            const toModify = this.floorMaps.find(m => m.id === mapConfig.id);
                            toModify.backgroundImage = mapConfig.backgroundImage;
                            toModify.renderedImage = mapConfig.renderedImage;
                            toModify.items = mapConfig.items;
                            const resultMsg = this.config.setFloorMaps(this.floorMaps);
                            if (resultMsg.length === 0) {
                                this.currentFloorMap = this.floorMapsDict[mapConfig.id];
                                this.service.loadMap(this.currentFloorMap);
                            } else {
                                alert(resultMsg);
                            }
                        }
                    });
            });

    }

    public onDownloadJsonMapClick(): void {
        this.files.saveJsonFile(`map-floor-${this.currentFloorMap.id}.json`, this.service.snapshotMap());
    }

    public onLoadMapClick(floor: number): void {
        if (floor !== this.currentFloorMap.id) {
            this.saveCurrentFloorMapConfig();

            // open new
            this.currentFloorMap = this.floorMapsDict[floor];
            this.service.loadMap(this.currentFloorMap)
                .subscribe(() => {
                });
        }
        this.editorSettings.currentFloorMap = floor;
    }

    private saveCurrentFloorMapConfig(): void {
        // save current map
        const snapMap = this.service.snapshotMap();

        // currentFloorMap contains current floor reference from floorMaps
        this.currentFloorMap.items = snapMap.items;
        this.currentFloorMap.renderedImage = snapMap.renderedImage;
        this.currentFloorMap.backgroundImage = snapMap.backgroundImage;
        this.currentFloorMap.mapWidth = snapMap.mapWidth;
        this.currentFloorMap.mapHeight= snapMap.mapHeight;
    }

    private updateLocalConfig(): void {
        this.saveCurrentFloorMapConfig();

        // update original config with updated set of floor maps
        this.config.setFloorMaps(this.floorMaps);
        this.config.setEditorSettings(this.editorSettings);
    }

    private questionDialog(title: string, message: string): Observable<boolean> {
        const dialogRef = this.dialog.open(QuestionDialogComponent, {
            data: <DialogData>{title, message}
        });
        return dialogRef.afterClosed();
    }

    private reloadConfig(): Observable<any> {
        this.objectTypes = this.config.getObjectTypes();
        this.floorMaps = this.config.getFloorMaps();
        this.floorMapsDict = {};
        this.floorMaps.forEach(m => {
            this.floorMapsDict[m.id] = m;
        });
        this.editorSettings = this.config.getEditorSettings();
        this.currentFloorMap = this.floorMapsDict[this.editorSettings.currentFloorMap];
        this.service.setActiveObject(
            this.objectTypes[0]
        );
        return this.service.loadMap(this.currentFloorMap);
    }

    private onRolesUpdates(roles: Role[]): void {
        this.visible.asideMarginSpace = false;
        this.visible.adminToolbar = false;
        this.visible.objectsToolbar = false;
        this.visible.toolsToolbar = false;

        if (roles.length === 0 || roles.length === 1 && roles[0] === Role.Viewer) {
            this.service.toggleGrid(false);
            this.service.setReadOnlyMode(true).subscribe(() => {
            });
        } else {

            if (_.includes(roles, Role.Admin)) {
                this.visible.adminToolbar = true;
                this.visible.objectsToolbar = true;
                this.visible.toolsToolbar = true;
                this.visible.asideMarginSpace = true;
                if (this.service.isReadOnly) {
                    this.service.setReadOnlyMode(false).subscribe(() => {
                    });
                }
                return;
            }

            if (_.includes(roles, Role.MapEditor)) {
                this.visible.objectsToolbar = true;
                this.visible.toolsToolbar = true;
                this.visible.asideMarginSpace = true;
                if (this.service.isReadOnly) {
                    this.service.setReadOnlyMode(false).subscribe(() => {
                    });
                }
            }


        }
    }

}
