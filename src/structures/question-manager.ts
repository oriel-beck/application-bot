import type { Question } from '../types';
import { readFile } from "fs/promises";
import { join } from "path";
import { BaseManager } from "./base-manager";

export class QuestionManager extends BaseManager {
    defaultQuestions: string[] = [];
    questions: Question[] = [];

    constructor() {
        super('questions')
        this.initQuestions();
    }

    create(question: string) {
        return this.driver.execute('INSERT INTO appbot.questions (question, id) VALUES (?, UUID())', [question]);
    }

    delete(id: string) {
        return this.driver.execute('DELETE FROM appbot.questions WHERE id = ?', [id]);
    }

    update(id: string, field: string, value: any) {
        return this.driver.execute('UPDATE appbot.questions SET ? = ? WHERE id = ?', [field, value, id]);
    }

    getRand(max: number) {
        return this.randomizeQuestions().splice(0, max);
    }

    private randomizeQuestions() {
        let array = [...this.questions];
        let currentIndex = array.length, randomIndex;

        // While there remain elements to shuffle.
        while (currentIndex != 0) {

            // Pick a remaining element.
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }

        return array;
    }

    private getAllQuestions() {
        return this.driver.execute('SELECT * FROM appbot.questions')
    }

    private getJsonQuestions() {
        return readFile(join(process.cwd(), 'json', 'questions.json'), { encoding: 'utf-8' }).catch(() => '[]').then((json) => JSON.parse(json) as string[]);
    }

    private async initQuestions() {
        const storedQuestions = await this.getAllQuestions();
        console.log(storedQuestions);
        const jsonQuestios = await this.getJsonQuestions()
        console.log(jsonQuestios)
        this.defaultQuestions = jsonQuestios;
    }
}