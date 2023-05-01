import { container } from "@sapphire/framework";

export abstract class BaseManager {
    driver = container.driver;
    constructor(name: keyof typeof container) {
        if (container[name]) {
            console.warn('It\'s not recommended to create more than 1 instance of', BaseManager.constructor.name);
        }
        console.log(BaseManager.constructor.name, 'is ready');
    }
}