import { container } from "@sapphire/framework";
import { BaseManager } from "./base.manager";
import { ApplicationState, type ApplicationStateKeys } from "../../constants/application";
import type { Application } from "../../types";

export class ApplicationManager extends BaseManager {
    max = 25;
    constructor() {
        super('applications')
    }

    public create(userid: string, questions: string[], message: string) {
        // TODO: add max to settings
        return this.driver.execute(this.genInsert('user', 'questions', 'answers', 'message', 'state'), [userid, questions, [], message, 'active'], { prepare: true });
    }

    public get(userid: string) {
        return this.driver.execute(this.genSelect('*', 'user'), [userid], { prepare: true });
    }

    public getAll(state: ApplicationStateKeys = ApplicationState.pending) {
        return this.driver.execute(`SELECT * FROM ${this.name} WHERE state = ?`, [state], { prepare: true });
    }

    public delete(userid: string) {
        return this.driver.execute(this.genDelete('user'), [userid], { prepare: true });
    }

    public update(userid: string, field: keyof Application, value: any) {
        return this.driver.execute(this.genUpdate(field, 'user'), [value, userid], { prepare: true });
    }

    public addAnswer(userid: string, answer: string) {
        return this.driver.execute(`UPDATE applications SET answers = answers + ? WHERE user = ?`, [[answer], userid], { prepare: true });
    }

    public editAnswer(userid: string, question: number, answer: string) {
        return this.driver.execute(`UPDATE applications SET answers[${question}] = ? WHERE user = ?`, [answer, userid], { prepare: true });
    }
}

container.applications = new ApplicationManager();