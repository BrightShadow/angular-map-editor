import {Injectable} from '@angular/core';
import {MapObject} from '../models/map-object';
import * as _ from 'lodash';

@Injectable({
    providedIn: 'root'
})
export class MathematicsService {
    /**
     * Get position snapped to the center of current grid cell (snapped to grid).
     * @param xy A location of the point to snap.
     * @param gridSize Size of grid cell.
     */
    public getSnappedToGridObjectPos(xy: XY, gridSize: number): XY {

        const xCells = Math.floor(xy.x / gridSize);
        const xx = xCells * gridSize + Math.floor(gridSize / 2);

        const yCells = Math.floor(xy.y / gridSize);
        const yy = yCells * gridSize + Math.floor(gridSize / 2);

        return {
            x: xx, y: yy
        };

    }

    /**
     * Converts degrees to radians.
     * @param deg Value of degrees.
     */
    public toRadians(deg: number): number {
        return deg * Math.PI / 180;
    }

    /**
     * Returns a new coordinates of the center of object located at xy, having size w x h.
     * @param xy Location of left upper object corner.
     * @param w Width of object.
     * @param h Height of object.
     */
    public centeredPos(xy: XY, w: number, h: number): XY {
        return {
            x: xy.x + Math.floor(w / 2), y: xy.y + Math.floor(h / 2)
        };
    }

    /**
     * Returns left upper corner location using xy position of object center, having size w x h.
     * @param xy Location of center point of object (rotation center).
     * @param w Width of object.
     * @param h Height of object.
     */
    public decenteredPos(xy: XY, w: number, h: number): XY {
        return {
            x: xy.x - Math.floor(w / 2), y: xy.y - Math.floor(h / 2)
        };
    }

    public objectContainsPoint(obj: MapObject, xy: XY): boolean {

        const p: XY4 = this.getObjectCorners(obj, Bounds.zero());
        const A = this.calculateTriangleArea(p.p1, p.p2, p.p3) + this.calculateTriangleArea(p.p3, p.p4, p.p1);
        const A1 = this.calculateTriangleArea(xy, p.p1, p.p2);
        const A2 = this.calculateTriangleArea(xy, p.p2, p.p3);
        const A3 = this.calculateTriangleArea(xy, p.p3, p.p4);
        const A4 = this.calculateTriangleArea(xy, p.p4, p.p1);
        return A === (A1 + A2 + A3 + A4);

    }

    /**
     * Checks object corners including rotation.
     * @param obj An object to examine.
     * @param padding Additional padding to add to the target rectangle.
     */
    public getObjectCorners(obj: MapObject, padding: Bounds = Bounds.zero()): XY4 {
        const result = XY4.zero();

        // create source points
        const lt = this.decenteredPos({x: obj.x, y: obj.y}, obj.width, obj.height); // Left Top
        const rt = _.clone(lt); // Right Top
        rt.x += obj.width;
        const rb = _.clone(rt); // Right Bottom
        rb.y += obj.height;
        const lb = _.clone(rb); // Left Bottom
        rb.x -= obj.width;
        const center = {x: obj.x, y: obj.y};

        // apply padding
        if (padding) {
            lt.x -= padding.left;
            lt.y -= padding.top;
            rt.x += padding.right;
            rt.y -= padding.top;
            rb.x += padding.right;
            rb.y += padding.bottom;
            lb.x -= padding.left;
            lb.y += padding.bottom;
        }

        result.p1 = this.rotatePoint(lt, center, obj.rotation);
        result.p2 = this.rotatePoint(rt, center, obj.rotation);
        result.p3 = this.rotatePoint(rb, center, obj.rotation);
        result.p4 = this.rotatePoint(lb, center, obj.rotation);

        return result;
    }

    /**
     * Rotates point around a center by a specified angle in degrees.
     * @param point Point to rotate.
     * @param center A position of center point of rotation.
     * @param angle Angle of rotation in degrees.
     */
    public rotatePoint(point: XY, center: XY, angle: number): XY {

        const s = Math.sin(this.toRadians(-angle));
        const c = Math.cos(this.toRadians(-angle));
        // translate to center
        const newPoint = {
            x: point.x - center.x,
            y: point.y - center.y
        };
        const rotatedPoint = {
            x: newPoint.x * c - newPoint.y * s,
            y: newPoint.x * s + newPoint.y * c,
        };
        // translate back from center
        newPoint.x = rotatedPoint.x + center.x;
        newPoint.y = rotatedPoint.y + center.y;
        return newPoint;

    }

    private calculateTriangleArea(p1: XY, p2: XY, p3: XY): number {
        return Math.abs((p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2.0);
    }
}

export type XY = { x: number, y: number };

export class XY4 {
    constructor(public p1: XY = {x: 0, y: 0},
                public p2: XY = {x: 0, y: 0},
                public p3: XY = {x: 0, y: 0},
                public p4: XY = {x: 0, y: 0}) {

    }

    public static zero(): XY4 {
        return new XY4({x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0});
    }

    public static uniform(p: number): XY4 {
        return new XY4({x: p, y: p}, {x: p, y: p}, {x: p, y: p}, {x: p, y: p});
    }
}

export class Bounds {
    constructor(public top: number = 0,
                public right: number = 0,
                public bottom: number = 0,
                public left: number = 0) {
    }

    public static zero(): Bounds {
        return new Bounds();
    }

    public static uniform(v: number): Bounds {
        return new Bounds(v, v, v, v);
    }
}
