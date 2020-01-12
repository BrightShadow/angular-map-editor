import {Injectable} from '@angular/core';
import {MapObject} from '../models/map-object';
import {MathematicsService} from './mathematics.service';

@Injectable({
    providedIn: 'root'
})
export class EditorLayersService {
    public objects: MapObject[] = [];

    constructor(private math: MathematicsService) {

    }

    /**
     * Adds new object to the top of objects collection.
     * @param o
     */
    public add(o: MapObject): void {
        o.id = this.objects.length + 100;
        (<any>o.element).refId = o.id;
        this.objects.push(o);
    }

    /**
     * Finds an object that overlays given layer, removes it and returns.
     * @param id Unique object id. Can be found as a refId on nativeElement.
     */
    public remove(id: number): MapObject {

        const foundIndex = this.findObjectIndex(id);
        if (foundIndex >= 0) {
            const foundObject = this.objects[foundIndex];
            this.objects.splice(foundIndex, 1);
            return foundObject;
        }
        return undefined;

    }

    /**
     * Removes last added object.
     */
    public removeLastAdded(): MapObject {

        if (this.objects.length > 0) {
            const foundObject = this.objects[this.objects.length - 1];
            this.objects.splice(this.objects.length - 1, 1);
            return foundObject;
        }
        return undefined;

    }

    /**
     * Removes a particular instance of an object from the array.
     * @param obj An instance to remove.
     */
    public removeObject(obj: MapObject): void {

        const index = this.objects.indexOf(obj);
        if (index >= 0) {
            this.objects.splice(index, 1);
        }

    }

    /**
     * Returns top most object that is overlapping given point.
     * @param id Unique object id. Can be found as a refId on nativeElement.
     */
    public getObject(id: number): MapObject {

        const foundIndex = this.findObjectIndex(id);
        if (foundIndex >= 0) {
            return this.objects[foundIndex];
        }
        return undefined;

    }

    /**
     * Removes all objects
     */
    public clear(): void {
        this.objects = null;
        this.objects = [];
    }

    /**
     * Moves given object to the top of the list (makes it last in the list).
     * Remember to reorder z-index of native element.
     */
    public bringToTop(obj: MapObject): void {

        const index = this.objects.indexOf(obj);
        if (index !== this.objects.length - 1) {
            this.removeObject(obj);
            this.objects.push(obj);
        }
    }

    /**
     * Moves given object to the bottom of the list (makes it first in the list).
     * Remember to reorder z-index of native element.
     */
    public bringToBottom(obj: MapObject): void {
        const index = this.objects.indexOf(obj);
        if (index !== 0) {
            this.removeObject(obj);
            this.objects.unshift(obj);
        }
    }

    private findObjectIndex(id: number): number {

        let foundIndex = -1;
        let foundObject: MapObject = null;
        for (let i = this.objects.length - 1; i >= 0; i--) {
            foundObject = this.objects[i];
            if (foundObject.id === id) {
                foundIndex = i;
                break;
            }
        }
        return foundIndex;

    }

}
