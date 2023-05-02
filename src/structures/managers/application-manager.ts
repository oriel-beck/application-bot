import { container } from "@sapphire/framework";
import { BaseManager } from "./base-manager";

export class ApplicationManager extends BaseManager {
    max = 25
    constructor() {
        super('applications')
    }
    
    public create(userid: string | bigint) {
        // TODO: add max to settings
        const questions = container.questions.getRand(this.max);
        return this.driver.execute(this.genInsert('user', 'questions', 'answers', 'message'), [BigInt(userid), questions, [], null]);
    }

    public get(userid: string | bigint) {
        return this.driver.execute(this.genSelect('user'), [BigInt(userid)]);
    }

    public delete(userid: string | bigint) {
        return this.driver.execute(this.genDelete('user'), [BigInt(userid)]);
    }

    public update(userid: string | bigint, field: string, value: any) {
        return this.driver.execute(this.genUpdate(field, 'user'), [value, BigInt(userid)]);
    }

    public addAnswer(userid: string | bigint, question: number, answer: string) {
        return this.driver.execute(this.genUpdate(`answers[${question}]`, 'user'), [answer, BigInt(userid)]);
    }
}

container.applications = new ApplicationManager();