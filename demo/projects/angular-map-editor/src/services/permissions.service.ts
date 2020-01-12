import {Injectable} from '@angular/core';
import {Role} from '../models/role.enum';

@Injectable({
    providedIn: 'root'
})
export class PermissionsService {

    public isObjectsToolbarVisible(roles: Role[]): boolean {
        return false;
    }

    public isConfigurationToolbarVisible(roles: Role[]): boolean {
        return false;
    }

    public isSaveConfigButtonVisible(roles: Role[]): boolean {
        return false;
    }

    public isEditingToolbarVisible(roles: Role[]): boolean {
        return false;
    }

    public isEmployeesToolbarVisible(roles: Role[]): boolean {
        return false;
    }

    public isEditingEnabled(roles: Role[]): boolean {
        return false;
    }

    public is3DMapToolbarVisible(roles: Role[]): boolean {
        return false;
    }


}
