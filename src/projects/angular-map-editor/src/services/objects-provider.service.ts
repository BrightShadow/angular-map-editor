import {Injectable} from '@angular/core';
import {MapObject} from '../models/map-object';
import {AssetsProviderService, loadImage} from './assets-provider.service';
import {ConfigService} from './config.service';
import {ReplaySubject} from 'rxjs';
import {zip} from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ObjectsProviderService {
    private images: { [type: string]: HTMLImageElement } = {};
    private objects: { [type: string]: MapObject } = {};
    public changed = new ReplaySubject(1);

    constructor(private assets: AssetsProviderService,
                private config: ConfigService) {
        zip(assets.changed, config.changed)
            .subscribe(() => {
                this.loadImages();
            });
    }

    public getObjects(): MapObject[] {
        const result = [];
        for (let key in this.objects) {
            result.push(this.objects[key]);
        }
        return result;
    }

    public get(type: string): MapObject {
        return new MapObject(this.objects[type]);
    }

    public getImage(type: string): HTMLImageElement {
        return this.images[type];
    }

    private loadImages(): Promise<boolean> {

        const mapObjects = this.config.getMapObjects();
        const loadPromises: Promise<HTMLImageElement>[] = [];

        for (let i = 0; i < mapObjects.length; i++) {
            const data = this.assets.getObject(mapObjects[i].image);
            loadPromises.push(loadImage(data));
            this.images[mapObjects[i].type] = <any> {};
        }
        return Promise.all(loadPromises)
            .then(values => {

                for (let i = 0; i < mapObjects.length; i++) {
                    this.images[mapObjects[i].type] = values[i];
                    this.objects[mapObjects[i].type] = new MapObject(
                        {
                            x: 0,
                            y: 0,
                            width: values[i].width,
                            height: values[i].height,
                            rotation: 0,
                            type: mapObjects[i].type
                        }
                    );
                }

                this.changed.next();
                return true;
            })
            .catch(e => {
                console.log(e);
                this.changed.next();
                return false;
            });
    }

}
