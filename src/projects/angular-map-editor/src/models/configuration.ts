
export interface Configuration {
    /**
     * A set of graphical and non-graphical assets encoded in base64 strings.
     */
    assets: AssetsConfig;
    /**
     * All available map object types.
     */
    mapObjectTypes: string[];
    /**
     * A set of map objects.
     */
    mapObjects: MapObjectConfig[];
    /**
     * A configurations for each floor map.
     */
    floorMaps: MapConfig[];

    /**
     * A settings of editor.
     */
    editorSettings: EditorSettings;
}

export interface MapConfig {
    /**
     * Unique floor map id - a floor number 1, 3, 4...
     */
    id: number;
    /**
     * Icon representation of floor.
     */
    icon: string;
    /**
     * File name of background image asset.
     */
    backgroundImage: string;
    /**
     * Final rendered raster image representing map with all objects over it.
     */
    renderedImage: string;
    /**
     * Map width in pixels (same as background image width).
     * This param is optional when loading new configuration, but it is always saved and
     * exported.
     */
    mapWidth?: number;
    /**
     * Map height in pixels (same as background image height).
     * This param is optional when loading new configuration, but it is always saved and
     * exported.
     */
    mapHeight?: number;
    /**
     * Map items to be rendered in the same order as in this array.
     */
    items: MapItem[];
}

export interface AssetsConfig {
    /**
     * Map objects and other object images.
     */
    objects: Asset[];
    /**
     * Icons.
     */
    icons: Asset[];
    /**
     * Other images and files.
     */
    others: Asset[];
}

/**
 * A structure representing an asset.
 */
export interface Asset {
    /**
     * Asset name - file name with extension.
     */
    name: string;
    /**
     * A base64 encoded file representation string.
     */
    data: string;
}

export interface MapObjectConfig {
    /**
     * Name of the asset file representing objects.
     */
    image: string;
    /**
     * Name of the file - icon representation of this object.
     */
    icon: string;
    /**
     * Defines a type if object.
     */
    type: string;
}

export interface MapItem {
    x: number;
    y: number;
    z: number;
    /**
     * Rotation in degrees.
     */
    rotation: number;
    /**
     * Type of the object which is represented by this item.
     */
    type: string;
    /**
     * Optional name of the object.
     * This is planned to be used for employees locations presentation (kzz),
     * as an id of sensor for smart office.
     */
    name?: string;
    /**
     * Any additional options of this item. Can be different for different objects.
     */
    options?: any;
}

export interface ToolbarItemSettings {
    /**
     * A short info about item - used e.g. in tooltips or captions.
     */
    caption: string;
    /**
     * File name of the icon asset.
     */
    icon: string;
    /**
     * Object type of the item - if undefined it is a header of menu.
     */
    type?: string;
    /**
     * A collection of sub-items if this is a drop-down like item.
     */
    items?: ToolbarItemSettings[];

}

export interface EditorSettings {
    /**
     * Snap to grid option.
     */
    snapToGrid: boolean;
    /**
     * Visibility of the grid.
     */
    showGrid: boolean;
    /**
     * Id of currently selected floor map.
     */
    currentFloorMap: number;
    /**
     * A set of objects toolbar items.
     */
    toolbar: ToolbarItemSettings[];
}

