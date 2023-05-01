import { container } from "@sapphire/framework";
import { BaseManager } from "./base-manager";

export class ApplicationManager extends BaseManager {
    constructor() {
        super('applications')
    }
    
    async create(userid: string | bigint) {
        // TODO: add max to settings
        const questions = container.questions.getRand(15).map((question) => question.question);
        return this.driver.execute('INSERT INTO appbot.applications (user, questions, answers, message) VALUES (?, ?, ?, ?) IF NOT EXISTS', [BigInt(userid), questions, [], null]);
    }

    get(userid: string | bigint) {
        return this.driver.execute('SELECT * FROM appbot.applications WHERE user = ?', [BigInt(userid)]);
    }

    delete(userid: string | bigint) {
        return this.driver.execute('DELETE FROM appbot.applications WHERE user = ?', [BigInt(userid)]);
    }

    update(userid: string | bigint, field: string, value: any) {
        return this.driver.execute('UPDATE appbot.applications SET ? = ? WHERE user = ?', [field, value, BigInt(userid)]);
    }

    addAnswer(userid: string | bigint, question: number, answer: string) {
        return this.driver.execute(`UPDATE appbot.questions SET answers[${question}] = ? WHERE user = ?`, [answer, BigInt(userid)]);
    }
}

container.applications = new ApplicationManager();