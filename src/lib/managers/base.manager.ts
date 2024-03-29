import { del, insert, select, update } from "@lib/db.utils.js";
import { container } from "@sapphire/framework";

export abstract class BaseManager {
    driver = container.driver;
    constructor(public name: keyof typeof container) {
        if (container[name]) {
            console.warn('It\'s not recommended to create more than 1 instance of', name);
        }
        console.log(name, 'manager is ready');
    }

    async init() {

    }

    public abstract create(...args: any[]): any;
    public abstract delete(...args: any[]): any;
    public abstract get(...args: any[]): any;
    public abstract update(id: string | bigint, field: string, value: any): any;

    genSelect = (selectedValue = '*', comparisonField: string) => select(this.name, selectedValue, comparisonField);
    genInsert = (...valueNames: string[]) => insert(this.name, valueNames);
    genUpdate = (field: string, comparisonField: string, rmTTL = false) => update(this.name, field, comparisonField, rmTTL);
    genDelete = (comparisonField: string) => del(this.name, comparisonField)
}