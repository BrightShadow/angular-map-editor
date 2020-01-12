export enum Role {
    /**
     * Full control over Map-Editor, including advanced restricted interference in map structure.
     * Roles: [All roles included]
     */
    Admin = 'admin',
    /**
     * User is able only to see the map.
     * Roles: [Viewer]
     */
    Viewer = 'viewer',
    /**
     * User is able to change map chairs, desks, furniture locations.
     * Roles: [Viewer + simple map edition]
     */
    MapEditor = 'map-editor',
    /**
     * User is able to edit employees locations.
     * Roles: [Viewer + employees location edition]
     */
    EmployeesEditor = 'employees-editor'
}
