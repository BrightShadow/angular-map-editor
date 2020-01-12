import {Model} from './model';

export class MapObject extends Model<MapObject> {
    public id?: number;
    /**
     * Object X position of the object center.
     */
    public x: number;
    /**
     * Object Y position of the object center.
     */
    public y: number;
    /**
     * Object Y position of the object center.
     */
    public z: number;
    /**
     * Rotation in degrees.
     */
    public rotation: number;
    /**
     * Object type.
     */
    public type: string;
    /**
     * Width of the object before rotation.
     */
    public width: number;
    /**
     * Height of the object before rotation.
     */
    public height: number;
    /**
     * An HTML div element acting as an interactive area.
     */
    public element?: HTMLDivElement;
    /**
     * Decides whether this object is currently a part of selection.
     */
    public isSelected: boolean;
    /**
     * Initializes a new instance of this model.
     * @param init Optional init params that will feed the class properties.
     */
    constructor(init?: Partial<MapObject>) {
        super(init);
    }
}
