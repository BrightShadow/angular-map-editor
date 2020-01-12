import {Injectable} from '@angular/core';
import {MapObject} from '../models/map-object';
import {ObjectsProviderService} from './objects-provider.service';
import {EditorLayersService} from './editor-layers.service';
import * as _ from 'lodash';
import {Bounds, MathematicsService, XY} from './mathematics.service';
import {AssetsProviderService, loadImage} from './assets-provider.service';
import {MapConfig, MapItem} from '../models/configuration';
import {ConfigService} from './config.service';
import {Observable, ReplaySubject, zip} from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class MapEditorService {

    private editor: HTMLCanvasElement;
    private editorBox: HTMLElement;
    private cursor: HTMLDivElement;
    private selectionBox: HTMLDivElement;
    private ctx: CanvasRenderingContext2D;
    private editorWidth: number;
    private editorHeight: number;
    private activeObject: MapObject;
    private hoveredObject: MapObject;
    private snapToGrid = true;
    private gridSize = 4;
    private showGrid = true;
    private selectingMode = false;
    private mousePos: XY;
    private rotation = 0;
    private backgroundImage: HTMLImageElement;
    private selection: MapObject[] = [];
    private selectionBounds: Bounds = new Bounds(
        Number.MAX_SAFE_INTEGER,
        -Number.MAX_SAFE_INTEGER,
        -Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER
    );
    private selectionBoxBounds: Bounds = undefined;
    private selectionBoxStart: XY = undefined;
    private selectionOverlapInterval: number;
    private initialized = false;
    private isMouseOverEditor = false;
    private isReadOnlyMode = false;
    private currentFloorMap: MapConfig;

    /**
     * Returns true if editor currently is in selection mode, so user has selected something or is
     * selecting something at the moment by dragging selection rectangle.
     */
    private get isInSelectionMode(): boolean {
        return this.selection.length > 0 || this.selectingMode;
    }

    /**
     * An event called when editor state changed due to dependencies change.
     */
    public changed = new ReplaySubject(1);

    /**
     * Returns true, if editor is currently in read-only mode.
     */
    public get isReadOnly(): boolean {
        return this.isReadOnlyMode;
    }


    constructor(private provider: ObjectsProviderService,
                private assets: AssetsProviderService,
                private layers: EditorLayersService,
                private math: MathematicsService,
                private config: ConfigService) {

        zip(provider.changed, assets.changed, config.changed)
            .subscribe(() => {
                if (!this.initialized) {
                    this.initialized = true;
                    this.init();
                }
                this.clear();
                this.redraw();
                this.changed.next();
            });
    }

    /**
     * Changes active cursor object selected by the user.
     * The type must be one of available object types from configuration.
     * @param type The type to select as active drawing object.
     */
    public setActiveObject(type: string): void {

        this.activeObject = this.provider.get(type);
        this.cursor.style.width = `${this.activeObject.width}px`;
        this.cursor.style.height = `${this.activeObject.height}px`;
        const img = this.provider.getImage(this.activeObject.type);
        this.cursor.style.backgroundImage = `url(${img.src})`;
        this.updateCursorRotation();

    }

    /**
     * Undo object insertion - not operation yet.
     */
    public undo(): void {
        const removed = this.layers.removeLastAdded();
        if (removed) {
            this.removeObject(removed);
            this.clean();
            this.drawLayers();
        }
    }

    /**
     * Performs 45 degrees rotation of current active object - cursor.
     */
    public rotate45(): number {

        this.rotation -= 45;
        if (this.rotation < -360) {
            this.rotation += 360;
        }

        this.updateCursorRotation();
        return this.rotation;

    }

    /**
     * Draws an object using location of it's center.
     * @param x A center of the object rotation.
     * @param y A center of the object rotation.
     */
    public drawObject(x: number, y: number): void {

        const active = _.cloneDeep(this.activeObject);
        const xy = this.getObjectPos({x, y}, active.width, active.height, false);
        active.x = xy.x;
        active.y = xy.y;
        active.rotation = this.rotation;
        this.drawObjectInternal(active);
        this.createInteractiveObjectElement(active);
        this.layers.add(active);

    }

    /**
     * Clear whole map editor, including graphics and interactive elements.
     */
    public clear(): void {
        this.layers.objects.forEach(x => {
            this.removeNativeChildOfObject(x);
        });
        this.layers.clear();
        this.clean();
    }


    /**
     * Toggle the grid on or off.
     */
    public toggleGrid(showGrid?: boolean): void {
        this.showGrid = _.isNil(showGrid) ? !this.showGrid : showGrid;
        this.redraw();
    }

    /**
     * Moves currently hovered or selected elements to the top of objects hierarchy.
     */
    public bringToTop(): void {
        if (this.isReadOnly) {
            return;
        }
        if (this.hoveredObject) {
            this.layers.bringToTop(this.hoveredObject);
            this.reload().subscribe(() => {});
        }
    }

    /**
     * Moves currently hovered or selected elements to the bottom of objects hierarchy.
     */
    public bringToBottom(): void {
        if (this.isReadOnly) {
            return;
        }
        if (this.hoveredObject) {
            this.layers.bringToBottom(this.hoveredObject);
            this.reload().subscribe(() => {});
        }
    }

    /**
     * Replaces current editor content with new map.
     * @param map A map to load into editor.
     */
    public loadMap(map: MapConfig): Observable<any> {
        return new Observable(o => {
            this.clear();
            this.currentFloorMap = map;
            const data = this.assets.getOther(map.backgroundImage);
            this.setBackgroundImage(data)
                .then(() => {
                    const tmp = this.activeObject;
                    const tmpRotation = this.rotation;
                    const snapGrid = this.snapToGrid;
                    this.snapToGrid = false;
                    map.items.forEach(item => {
                        this.setActiveObject(item.type);
                        this.onEditorMouseMove(<MouseEvent>{
                            offsetX: item.x,
                            offsetY: item.y
                        });
                        this.rotation = item.rotation;
                        this.updateCursorRotation();
                        this.drawObject(item.x, item.y);
                    });
                    this.onEditorMouseLeave();
                    this.rotation = tmpRotation;
                    this.setActiveObject(tmp.type);
                    this.snapToGrid = snapGrid;
                    o.next();
                    o.complete();
                });
        });
    }

    /**
     * Creates a current map snapshot and returns it as MapConfig instance.
     */
    public snapshotMap(): MapConfig {
        return <MapConfig>{
            id: this.currentFloorMap.id,
            backgroundImage: this.currentFloorMap.backgroundImage + '',
            mapWidth: this.backgroundImage.naturalWidth,
            mapHeight: this.backgroundImage.naturalHeight,
            items: this.layers.objects.map(o => {
                return <MapItem>{
                    x: o.x,
                    y: o.y,
                    z: 0,
                    rotation: o.rotation,
                    type: o.type
                };
            }),
            renderedImage: this.editor.toDataURL('image/png')
        };
    }

    /**
     * Changes editor mode to readonly, so the user can only view map, without any changes.
     * @param readOnly
     */
    public setReadOnlyMode(readOnly: boolean): Observable<any> {
        this.isReadOnlyMode = readOnly;
        return this.reload();
    }

    /**
     * Fully reloads and regenerates current map.
     */
    private reload(): Observable<any> {
        if (this.currentFloorMap) {
            return this.loadMap(this.snapshotMap());
        }
        return new Observable<any>(o => {
            o.next();
            o.complete();
        });
    }

    /**
     * Execute in ngAfterViewInit(), to initialize whole editor correctly.
     */
    private init(): void {

        this.editor = document.getElementById('editor') as HTMLCanvasElement;
        this.editorBox = document.getElementById('editorBox') as HTMLElement;
        this.cursor = document.createElement('div') as HTMLDivElement;
        this.cursor.style.position = 'absolute';
        this.cursor.style.opacity = '0.5';
        this.cursor.style.padding = '0';
        this.cursor.style.margin = '0';
        this.cursor.style.backgroundRepeat = 'no-repeat';
        this.cursor.style.display = 'none';
        this.cursor.style.pointerEvents = 'none';
        this.editorBox.appendChild(this.cursor);
        this.editorWidth = this.editor.offsetWidth;
        this.editorHeight = this.editor.offsetHeight;
        this.ctx = this.editor.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        // selection
        this.selectionBox = document.createElement('div') as HTMLDivElement;
        this.selectionBox.style.position = 'absolute';
        this.selectionBox.style.padding = '0';
        this.selectionBox.style.margin = '0';
        this.selectionBox.style.display = 'none';
        this.selectionBox.style.pointerEvents = 'none';
        this.selectionBox.style.width = 'auto';
        this.selectionBox.style.height = 'auto';
        this.selectionBox.style.border = '1px dashed blue';
        this.editorBox.appendChild(this.selectionBox);

        this.editor.addEventListener('mousemove', e => {
            this.onEditorMouseMove(e as MouseEvent);
        });

        this.editor.addEventListener('mousedown', e => {
            this.onEditorMouseDown(e as MouseEvent);
        });

        this.editor.addEventListener('mouseup', e => {
            this.onEditorMouseUp(e as MouseEvent);
        });

        this.editor.addEventListener('mouseenter', () => {
            this.onEditorMouseEnter();
        });

        this.editor.addEventListener('mouseleave', () => {
            this.onEditorMouseLeave();
        });

        this.editor.addEventListener('click', (event: MouseEvent) => {
            this.onEditorClick(event);
        });

        this.initGlobalEventHooks();

    }

    /**
     * Cleans the canvas and redraws background image and grid if turned on.
     * Not touching interactivity elements.
     */
    private clean(): void {
        this.ctx.beginPath();
        this.ctx.rect(0, 0, this.editorWidth, this.editorHeight);
        this.ctx.fillStyle = 'white';
        this.ctx.fill();

        if (this.backgroundImage) {
            this.ctx.drawImage(this.backgroundImage, 0, 0);
        }

        if (this.showGrid) {
            this.drawGrid(this.gridSize);
        }
    }

    /**
     * Changes background image of the editor and redraws all graphics
     * over it.
     * @param imageData Base64 image to set as background.
     */
    private setBackgroundImage(imageData: string): Promise<any> {

        return loadImage(imageData)
            .then((image: HTMLImageElement) => {
                this.backgroundImage = image;
                this.editor.setAttribute('width', image.width.toString());
                this.editor.setAttribute('height', image.height.toString());
                this.editorBox.style.width = `${image.width}px`;
                this.editorBox.style.height = `${image.height}px`;
                this.editorWidth = this.editor.offsetWidth;
                this.editorHeight = this.editor.offsetHeight;
                this.ctx = this.editor.getContext('2d');
                this.redraw();
            });

    }

    /**
     * Draws whole canvas content again - redraws it, not touching
     * any interactivity objects like map object native elements.
     */
    private redraw(): void {
        this.clean();
        this.drawLayers();
    }

    /**
     * Rotates current cursor div according to current rotation.
     */
    private updateCursorRotation(): void {
        this.cursor.style.transform = `rotate(${360 - this.rotation}deg)`;
    }

    /**
     * Initializes global keyboard event hooks to handle shortcuts.
     */
    private initGlobalEventHooks(): void {
        window.addEventListener('keyup', (e: KeyboardEvent) => {
            this.onGlobalKeyPress(e);
            this.onGlobalKeyUp(e);
        });
        window.addEventListener('keydown', (e: KeyboardEvent) => this.onGlobalKeyDown(e));
    }

    /**
     * Handles global key down events of the browser.
     * @param event Keyboard event data.
     */
    private onGlobalKeyDown(event: KeyboardEvent): void {
        if (this.isReadOnly) {
            return;
        }
        const code = event.code;
        if (code === 'ControlLeft' && !this.selectingMode) {
            this.selectingMode = true;
            this.cursor.style.display = 'none'; // hide cursor of object
        }

        if (this.isInSelectionMode &&
            (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'ArrowUp' || code === 'ArrowDown')) {

            const step = event.ctrlKey ? 10 : 1;
            let x = 0;
            let y = 0;
            if (code === 'ArrowLeft') {
                x = -step;
            } else if (code === 'ArrowRight') {
                x = step;
            }
            if (code === 'ArrowUp') {
                y = -step;
            } else if (code === 'ArrowDown') {
                y = step;
            }

            this.transformSelection(x, y);
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }

    /**
     * Handles global key up events of the browser.
     * @param event Keyboard event data.
     */
    private onGlobalKeyUp(event: KeyboardEvent): void {
        if (this.isReadOnly) {
            return;
        }
        if (event.code === 'ControlLeft') {
            this.selectingMode = false;
            if (!this.isInSelectionMode && this.isMouseOverEditor) {
                this.onEditorMouseMove(<any>{
                    offsetX: this.mousePos.x,
                    offsetY: this.mousePos.y
                });
            }
        }
    }

    /**
     * Handles global key press event - useful for key combinations.
     * @param event Keyboard event data.
     */
    private onGlobalKeyPress(event: KeyboardEvent): void {
        if (this.isReadOnly) {
            return;
        }
        let key = `${event.ctrlKey ? 'Ctrl+' : ''}${event.altKey ? 'Alt+' : ''}${event.shiftKey ? 'Shift+' : ''}`;
        key += event.code ? event.code : '';

        switch (key) {
            case 'Ctrl+KeyZ':
                this.undo();
                event.preventDefault();
                event.stopPropagation();
                break;
            case 'KeyR':
                this.rotate45();
                event.preventDefault();
                event.stopPropagation();
                break;
            case 'Delete':
                if (this.hoveredObject && !this.isInSelectionMode) {
                    this.removeObject(this.hoveredObject);
                    event.preventDefault();
                    event.stopPropagation();
                    this.hoveredObject = undefined;
                    this.triggerMouseMove();
                } else if (this.isInSelectionMode) {
                    this.deleteSelectedObjects();
                    event.preventDefault();
                    event.stopPropagation();
                    this.hoveredObject = undefined;
                    this.triggerMouseMove();
                }
                break;
            case 'KeyG':
                this.toggleGrid();
                break;

            case 'BracketLeft':
                this.bringToBottom();
                break;

            case 'BracketRight':
                this.bringToTop();
                break;

            // case 'KeyA':
            //     // MARK all 4 corners as red balls
            //     const a = _.clone(this.activeObject);
            //     a.x = this.mousePos.x;
            //     a.y = this.mousePos.y;
            //     const aligned = this.math.getSnappedToGridObjectPos({x: a.x, y: a.y}, this.gridSize);
            //     a.x = aligned.x;
            //     a.y = aligned.y;
            //     a.rotation = this.rotation;
            //
            //     const c = this.math.getObjectCorners(a, Padding.zero());
            //     console.log(c);
            //     this.ctx.beginPath();
            //     this.ctx.fillStyle = 'red';
            //     this.ctx.moveTo(c.p1.x, c.p1.y);
            //     this.ctx.ellipse(c.p1.x, c.p1.y, 3, 3, 0, 0, 2 * Math.PI);
            //     this.ctx.moveTo(c.p2.x, c.p2.y);
            //     this.ctx.ellipse(c.p2.x, c.p2.y, 3, 3, 0, 0, 2 * Math.PI);
            //     this.ctx.moveTo(c.p3.x, c.p3.y);
            //     this.ctx.ellipse(c.p3.x, c.p3.y, 3, 3, 0, 0, 2 * Math.PI);
            //     this.ctx.moveTo(c.p4.x, c.p4.y);
            //     this.ctx.ellipse(c.p4.x, c.p4.y, 3, 3, 0, 0, 2 * Math.PI);
            //     this.ctx.fill();
            //
            //     event.preventDefault();
            //     event.stopPropagation();
            //     break;
            default:
        }
    }

    /**
     * Creates an interactive DIV element used to select and hover map objects.
     * Givern active object is used to get interactive object properties.
     * @param active Existing map object to be linked with interactive object.
     */
    private createInteractiveObjectElement(active: MapObject): void {
        // create interactive element
        const div = document.createElement('div') as HTMLDivElement;
        div.style.transform = this.cursor.style.transform;
        const left = parseFloat(this.cursor.style.left.replace('px', ''));
        const top = parseFloat(this.cursor.style.top.replace('px', ''));
        div.style.left = `${left - 4}px`;
        div.style.top = `${top - 4}px`;
        div.style.opacity = '0';
        div.style.padding = '3px';
        div.style.border = '1px dashed lime';
        div.style.position = 'absolute';
        div.style.backgroundColor = 'rgba(0,255,0,0.1)';
        div.style.zIndex = '2'; // `${this.layers.objects.length + 10}`;
        div.style.width = `${active.width}px`;
        div.style.height = `${active.height}px`;
        div.className = 'editor-object-overlay';
        div.onmouseover = () => {
            if (active.isSelected || this.isReadOnly) {
                return;
            }
            div.style.opacity = '1';
            this.hoveredObject = active;
        };
        div.onmouseenter = () => {
            if (active.isSelected || this.isReadOnly) {
                return;
            }
            div.style.opacity = '1';
            this.hoveredObject = active;
        };
        div.onmouseleave = () => {
            if (active.isSelected || this.isReadOnly) {
                return;
            }
            div.style.opacity = '0';
            this.hoveredObject = null;
        };
        div.onmouseout = () => {
            if (active.isSelected || this.isReadOnly) {
                return;
            }
            div.style.opacity = '0';
            this.hoveredObject = null;
        };
        div.onmousemove = (e: MouseEvent) => {
            const editorR = this.editor.getBoundingClientRect();
            const elementR = div.getBoundingClientRect();
            this.mousePos = {
                x: elementR.left - editorR.left + e.offsetX,
                y: elementR.top - editorR.top + e.offsetY
            };
        };
        div.onclick = (e: MouseEvent) => {
            if (this.isReadOnly) {
                return;
            }
            if (e.ctrlKey) {
                this.toggleSelection(active);
            } else if (!active.isSelected && this.isInSelectionMode) {
                this.clearSelection(false);
            }
        };

        this.editorBox.appendChild(div);
        active.element = div;
    }


    private canPerformSelection(): boolean {
        return this.hoveredObject && this.selectingMode;
    }

    /**
     * Selects / Deselects given object - it uses interactive object to visualize selection.
     * @param obj Map object which selection will be changed.
     */
    private toggleSelection(obj: MapObject): void {
        if (this.selection.indexOf(obj) < 0) {
            this.selection.push(obj);
            obj.isSelected = true;
            obj.element.style.opacity = '1';
            obj.element.style.border = '1px dashed orange';
            obj.element.style.backgroundColor = 'rgba(255,152,114,0.1)';
            this.recalculateSelectionBounds(obj.element);

        } else {
            this.deselect(obj);
            this.selection.splice(this.selection.indexOf(obj), 1);
            this.recalculateSelectionBounds();
        }
    }

    /**
     * Recalculates selection bounds based on current selected objects list or
     * given selection field.
     * @param element An HTML object that represents current selection field, if not set,
     * a selection field with selected objects is used to calculated bounds.
     */
    private recalculateSelectionBounds(element?: HTMLElement): void {
        if (element) {
            const style = window.getComputedStyle(element);
            const x = this.extractStyleNumber(style.left);
            const y = this.extractStyleNumber(style.top);
            const w = element.clientWidth;
            const h = element.clientHeight;

            // move bounds
            if (this.selectionBounds.left > x) {
                this.selectionBounds.left = x;
            }
            if (this.selectionBounds.top > y) {
                this.selectionBounds.top = y;
            }
            if (this.selectionBounds.right < (x + w)) {
                this.selectionBounds.right = x + w;
            }
            if (this.selectionBounds.bottom < (y + h)) {
                this.selectionBounds.bottom = y + h;
            }

        } else {
            // contract bounds by checking all selected objects
            let minLeft = Number.MAX_SAFE_INTEGER;
            let minTop = Number.MAX_SAFE_INTEGER;
            let maxBottom = -Number.MAX_SAFE_INTEGER;
            let maxRight = -Number.MAX_SAFE_INTEGER;

            this.selection.forEach((obj: MapObject) => {
                const style = window.getComputedStyle(obj.element);
                const x = this.extractStyleNumber(style.left);
                const y = this.extractStyleNumber(style.top);
                minLeft = Math.min(minLeft, x);
                minTop = Math.min(minTop, y);
                maxBottom = Math.max(maxBottom, y + obj.element.clientHeight);
                maxRight = Math.max(maxRight, x + obj.element.clientWidth);
            });
            this.selectionBounds = new Bounds(minTop, maxRight, maxBottom, minLeft);
        }
    }

    /**
     * Deselects given map object.
     * @param obj A map object that will be deselected.
     */
    private deselect(obj: MapObject): void {
        obj.isSelected = false;
        obj.element.style.opacity = '0';
        obj.element.style.border = '1px dashed lime';
        obj.element.style.backgroundColor = 'rgba(0,255,0,0.1)';
    }

    /**
     * Deselects all currently selected map objects.
     * @param refreshMouseMoveEvent If set true, mouse move event of editor
     * is simulated to refresh cursor display and position.
     */
    private clearSelection(refreshMouseMoveEvent = true): void {
        this.selection.forEach(obj => {
            this.deselect(obj);
        });
        this.selection = [];
        if (refreshMouseMoveEvent) {
            this.onEditorMouseMove(<any>{
                offsetX: this.mousePos.x,
                offsetY: this.mousePos.y
            });
        }
        this.recalculateSelectionBounds();
    }

    /**
     * Translates location of all currently selected objects.
     * @param deltaX delta of X offset movement.
     * @param deltaY delta of Y offset movement.
     */
    private transformSelection(deltaX: number, deltaY: number): void {
        // validate bounds of selection
        const editorBorderWidth = 2;
        if (
            (deltaX > 0 && this.selectionBounds.right + deltaX >= this.editorWidth - editorBorderWidth) // right exceeded
            ||
            (deltaX < 0 && this.selectionBounds.left + deltaX <= 0) // left exceeded
            ||
            (deltaY > 0 && this.selectionBounds.bottom + deltaY >= this.editorHeight - editorBorderWidth) // bottom exceeded
            ||
            (deltaY < 0 && this.selectionBounds.top + deltaY <= 0) // top exceeded
        ) {
            return;
        }

        this.selection.forEach(obj => {
            obj.x += deltaX;
            obj.y += deltaY;
            obj.element.style.left = `${this.extractStyleNumber(obj.element.style.left) + deltaX}px`;
            obj.element.style.top = `${this.extractStyleNumber(obj.element.style.top) + deltaY}px`;
            this.redraw();
        });

        this.selectionBounds.left += deltaX;
        this.selectionBounds.right += deltaX;
        this.selectionBounds.top += deltaY;
        this.selectionBounds.bottom += deltaY;
    }

    /**
     * Checks if given object overlaps current selection field.
     * @param obj An object to check.
     */
    private overlapsSelectionBox(obj: MapObject): boolean {
        const style = window.getComputedStyle(obj.element);
        const left = this.extractStyleNumber(style.left);
        const top = this.extractStyleNumber(style.top);
        const right = left + obj.element.clientWidth;
        const bottom = top + obj.element.clientHeight;

        return !(right < this.selectionBoxBounds.left ||
            left > (this.editorWidth - this.selectionBoxBounds.right) ||
            bottom < this.selectionBoxBounds.top ||
            top > (this.editorHeight - this.selectionBoxBounds.bottom));
    }

    /**
     * Removes all currently selected objects - all from selection array.
     */
    private deleteSelectedObjects(): void {
        this.selection.forEach(obj => {
            this.removeNativeChildOfObject(obj);
            this.layers.removeObject(obj);
        });
        this.clearSelection();
        this.clean();
        this.drawLayers();
    }

    /**
     * Removes given object and all references like interactive native DIV object.
     * @param obj Map object to remove.
     */
    private removeObject(obj: MapObject): void {
        this.removeNativeChildOfObject(obj);
        this.layers.removeObject(obj);
        this.clean();
        this.drawLayers();
    }

    /**
     * Removes interactive native DIV object of the given map object.
     * @param obj Map object to use as reference.
     */
    private removeNativeChildOfObject(obj: MapObject): void {
        obj.element.onmouseleave = null;
        obj.element.onmouseenter = null;
        obj.element.onmouseout = null;
        obj.element.onmouseover = null;
        obj.element.onmousemove = null;
        obj.element.onclick = null;
        this.editorBox.removeChild(obj.element);
    }

    /**
     * Draws graphical representation of map object on canvas.
     * @param obj Reference map object to use for drawing.
     */
    private drawObjectInternal(obj: MapObject): void {

        const img = this.provider.getImage(obj.type);
        let xy: XY;
        this.ctx.save();
        this.ctx.translate(obj.x, obj.y);
        this.ctx.rotate(this.math.toRadians(-obj.rotation));
        xy = this.math.decenteredPos({x: 0, y: 0}, obj.width, obj.height);
        this.ctx.drawImage(img, xy.x, xy.y);
        this.ctx.restore();

    }

    /**
     * Draws a grid over current canvas.
     * Remember to control the order of drawing grid and other objects.
     * @param cellSize Size of grid cell in pixels.
     */
    private drawGrid(cellSize: number): void {

        let x = cellSize;
        let y = cellSize;
        this.ctx.beginPath();
        while (x < this.editorWidth) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.editorHeight);
            x += cellSize;
        }
        while (y < this.editorHeight) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.editorWidth, y);
            y += cellSize;
        }
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        this.ctx.stroke();

    }

    /**
     * Draws all graphical representations of all map objects.
     * Doesn;t touch any interactive elements.
     */
    private drawLayers(): void {

        this.layers.objects.forEach((o: MapObject) => {
            this.drawObjectInternal(o);
        });

    }

    /**
     * Gets object position according to grid and snapToGrid settings.
     * It is used instead of checking which of getDefaultObjectPos or getSnappedToGridObjectPos should be used.
     * @param xy Location of the left upper corner of object or a center of object (look on decentered param).
     * @param w Width of the object.
     * @param h Height of the object.
     * @param decentered Change current xy position of object center to left upper corner.
     */
    private getObjectPos(xy: XY, w: number, h: number, decentered: boolean = true): XY {

        const pos = this.snapToGrid ? this.math.getSnappedToGridObjectPos(xy, this.gridSize) : xy;
        if (decentered) {
            return this.math.decenteredPos(pos, w, h);
        }
        return pos;

    }

    /**
     * Enable or disable all map objects interactive overlays (DIV native objects).
     * When we are in read-only mode, this method is used to DISABLE all DIVs.
     * @param enable If true, all native DIVs interact with mouse, otherwise they look like invisible.
     */
    private toggleObjectOverlaysInteractivity(enable: boolean): void {
        const objects = document.getElementsByClassName('editor-object-overlay');
        for (let i = 0; i < objects.length; i++) {
            (objects[i] as HTMLDivElement).style.pointerEvents = enable ? 'auto' : 'none';
        }
    }

    /**
     * Handles event fired when user's mouse cursor enters Canvas.
     */
    private onEditorMouseEnter(): void {
        if (this.isReadOnly) {
            return;
        }

        this.isMouseOverEditor = true;
        if (this.activeObject && !this.isInSelectionMode) {
            this.cursor.style.display = 'block';
        }
    }

    /**
     * Handles event fired when user's mouse cursor leaves over Canvas.
     */
    private onEditorMouseLeave(): void {
        if (this.isReadOnly) {
            return;
        }

        this.selectionBoxStart = undefined;
        this.selectionBox.style.display = 'none';
        this.toggleObjectOverlaysInteractivity(true);
        window.clearInterval(this.selectionOverlapInterval);

        this.mousePos = {
            x: -1,
            y: -1
        };
        this.isMouseOverEditor = false;
        if (this.isInSelectionMode) {
            return;
        }
        this.cursor.style.display = 'none';
    }

    /**
     * Handles event fired when user presses mouse button over Canvas.
     * @param e Event data.
     */
    private onEditorMouseDown(e: MouseEvent): void {
        if (this.isReadOnly) {
            return;
        }

        if (this.isInSelectionMode) {
            this.clearSelection(false);
            this.selectionBoxStart = {x: e.offsetX, y: e.offsetY};
            this.selectionBoxBounds = new Bounds(-100, 100000, 100000, -100);
            this.toggleObjectOverlaysInteractivity(false);
            this.selectionOverlapInterval = window.setInterval(() => {
                for (let i = 0; i < this.layers.objects.length; i++) {
                    if (this.overlapsSelectionBox(this.layers.objects[i])) {
                        if (!this.layers.objects[i].isSelected) {
                            this.toggleSelection(this.layers.objects[i]);
                        }
                    } else if (this.layers.objects[i].isSelected) {
                        this.toggleSelection(this.layers.objects[i]); // deselects
                    }
                }
            }, 100);
        }
    }

    /**
     * Handles event fired when user releases mouse button over Canvas.
     * @param e Event data.
     */
    private onEditorMouseUp(e: MouseEvent): void {
        if (this.isReadOnly) {
            return;
        }

        this.selectionBox.style.display = 'none';
        this.toggleObjectOverlaysInteractivity(true);
        window.clearInterval(this.selectionOverlapInterval);
    }

    /**
     * Handles event fired when user moves mouse cursor over Canvas.
     * @param e Event data.
     */
    private onEditorMouseMove(e: MouseEvent): void {
        if (this.isReadOnly) {
            return;
        }

        this.mousePos = {
            x: e.offsetX,
            y: e.offsetY
        };
        this.isMouseOverEditor = true;
        if (this.activeObject) {
            const xy: XY = this.getObjectPos({
                x: e.offsetX,
                y: e.offsetY
            }, this.activeObject.width, this.activeObject.height);
            this.cursor.style.left = `${xy.x}px`;
            this.cursor.style.top = `${xy.y}px`;

            if (this.isInSelectionMode || this.selectionBoxStart) {

                if (this.selectionBoxStart) {
                    this.selectionBox.style.display = 'block';
                    const left = Math.min(this.selectionBoxStart.x, e.offsetX);
                    const right = this.editorWidth - Math.max(this.selectionBoxStart.x, e.offsetX);
                    const top = Math.min(this.selectionBoxStart.y, e.offsetY);
                    const bottom = this.editorHeight - Math.max(this.selectionBoxStart.y, e.offsetY);
                    this.selectionBox.style.left = `${left}px`;
                    this.selectionBox.style.top = `${top}px`;
                    this.selectionBox.style.right = `${right}px`;
                    this.selectionBox.style.bottom = `${bottom}px`;
                    this.selectionBoxBounds.top = top;
                    this.selectionBoxBounds.right = right;
                    this.selectionBoxBounds.bottom = bottom;
                    this.selectionBoxBounds.left = left;
                }


                return;
            }
            this.cursor.style.display = 'block';
        }

    }

    /**
     * Handles event fired when user click the Canvas.
     * @param e Event data.
     */
    private onEditorClick(e: MouseEvent): void {
        if (this.isReadOnly) {
            return;
        }

        if (this.selectionBoxStart) {
            this.selectionBoxStart = undefined;
        } else if (this.isInSelectionMode) {
            this.clearSelection();
        } else {
            this.drawObject(e.offsetX, e.offsetY);
        }
    }

    private triggerMouseMove(): void {
        this.onEditorMouseMove(<MouseEvent>{
           offsetX: this.mousePos.x,
           offsetY: this.mousePos.y
        });
    }

    /**
     * Returns a number representing CSS string value.
     * @param value A CSS string value (e.g. '12px', '3em', '45%'...)
     */
    private extractStyleNumber(value: string): number {
        const result = value.replace(/[A-Za-z%]/, '');
        return parseFloat(result);
    }
}
