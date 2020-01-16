import {Injectable} from '@angular/core';
import {MapObject} from '../models/map-object';

@Injectable({
    providedIn: 'root'
})
export class HistoryService {
    private historyLimit = 1000;
    private history: HistoryEntry[] = [];

    public pushEntry(entry: HistoryEntry): void {
        this.history.push(entry);

        if (this.history.length > this.historyLimit) {
            this.history.splice(0, 1); // remove the oldest entry
        }
    }

    public popEntry(): HistoryEntry {
        if (this.history.length > 0) {
            return this.history.pop();
        }
        return undefined;
    }

}

export abstract class HistoryEntry {
    public type: HistoryEntryType;
    public affected: MapObject[];
}

export class AddObjectEntry extends HistoryEntry {
    constructor() {
        super();
        this.type = HistoryEntryType.addObject;
    }
}

export class RemoveObjectEntry extends HistoryEntry {
    constructor() {
        super();
        this.type = HistoryEntryType.removeObject;
    }
}

export class ChangeObjectEntry extends HistoryEntry {
    public changes: {
        rotate: boolean,
        translateX: number;
        translateY: number;
        bringToTop: boolean;
        bringToBottom: boolean;
    }[];
    constructor() {
        super();
        this.type = HistoryEntryType.changeObject;
    }
}

export class PasteClipboardEntry extends HistoryEntry {
    constructor() {
        super();
        this.type = HistoryEntryType.paste;
    }
}


export enum HistoryEntryType {
    addObject,
    removeObject,
    changeObject,
    paste
}
