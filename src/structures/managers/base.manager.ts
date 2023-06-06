import { container } from "@sapphire/framework";
import { del, insert, select, update } from "../../util/db.utils";

export abstract class BaseManager {
    driver = container.driver;
    constructor(public name: keyof typeof container) {
        if (container[name]) {
            console.warn('It\'s not recommended to create more than 1 instance of', BaseManager.constructor.name);
        }
        console.log(name, 'manager is ready');
    }

    public abstract create(...args: any[]): any;
    public abstract delete(...args: any[]): any;
    public abstract get(...args: any[]): any;
    public abstract update(id: string | bigint, field: string, value: any): any;

    genSelect = (selectedValue = '*', comparisonField?: string) => select(this.name, selectedValue, comparisonField);
    genInsert = (...valueNames: string[]) => insert(this.name, valueNames);
    genUpdate = (field: string, comparisonField?: string) => update(this.name, field, comparisonField);
    genDelete = (comparisonField?: string) => del(this.name, comparisonField)
}