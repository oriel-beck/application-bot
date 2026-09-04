import { del, insert, select, update } from "@lib/db.utils.js";
import { container } from "@sapphire/framework";

export abstract class BaseManager {
    drizzle = container.drizzle;
    constructor(public name: keyof typeof container) {
        if (container[name]) {
            console.warn('It\'s not recommended to create more than 1 instance of', name);
        }
        console.log(name, 'manager is ready');
    }

    async init() {}

    public abstract create(...args: unknown[]): unknown;
    public abstract delete(...args: unknown[]): unknown;
    public abstract get(...args: unknown[]): unknown;
    public abstract update(id: string | bigint, field: string, value: unknown): unknown;

    genSelect = (selectedValue = '*', comparisonField: string) => select(this.name, selectedValue, comparisonField);
    genInsert = (...valueNames: string[]) => insert(this.name, valueNames);
    genUpdate = (field: string, comparisonField: string, rmTTL = false) => update(this.name, field, comparisonField, rmTTL);
    genDelete = (comparisonField: string) => del(this.name, comparisonField)
}