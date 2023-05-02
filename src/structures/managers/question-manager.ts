import type { Question } from '../../types';
import { readFile } from "fs/promises";
import { join } from "path";
import { BaseManager } from "./base-manager";
import { container } from '@sapphire/framework';
import { existsSync } from 'fs';

const jsonPaths = Object.freeze({
    rand: join(process.cwd(), 'json', 'rand-questions.json'),
    base: join(process.cwd(), 'json', 'base-questions.json')
});

export class QuestionManager extends BaseManager {
    defaultQuestions: string[] = [];
    questions: Question[] = [];

    constructor() {
        super('questions')
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

    get(id: string) {
        return this.driver.execute('SELECT * FROM appbot.questions WHERE id = ?', [id]);
    }

    getRand(max: number) {
        return this.defaultQuestions.concat(this.randomizeQuestions().splice(0, max - this.defaultQuestions.length).map((q) => q.question));
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
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }

        return array;
    }

    private async getRandomQuestionsFromFile() {
        if (existsSync(jsonPaths.rand)) {
            const json = await readFile(jsonPaths.rand, { encoding: 'utf-8' }).catch(() => '[]');
            return JSON.parse(json) as Question[];
        }
        return [];
    }

    private getAllQuestions() {
        return this.driver.execute('SELECT * FROM appbot.questions')
    }

    private async getJsonQuestionsFromFile() {
        if (existsSync(jsonPaths.base)) {
            const json = await readFile(jsonPaths.base, { encoding: 'utf-8' }).catch(() => '[]');
            return JSON.parse(json) as string[];
        }
        return [];
    }

    async initQuestions() {
        // TODO: insert only missing questions
        //const randQuestions = await this.getRandomQuestionsFromFile();
        //await Promise.all(randQuestions.map((q) => this.driver.execute('INSERT INTO appbot.questions (id, question) VALUES (?, ?) IF NOT EXISTS', [q.id, q.question])));


        // TODO: BATCH seems to error due to multi partition, not sure how to fix as this is targeting only 1 table so it shouldn't even care
        // await this.driver.batch(randQuestions.map((q) => ({
        //     query: 'INSERT INTO appbot.questions (id, question) VALUES (?, ?) IF NOT EXISTS',
        //     params: [q.id, q.question]
        // })));

        // TODO: make a function that checks the IDs of the stored questions, compares it to the random questions file and upload any missing (don't delete)
        const storedQuestions = await this.getAllQuestions();

        // get default questions (if any)
        const jsonQuestios = await this.getJsonQuestionsFromFile();

        this.defaultQuestions = jsonQuestios;
        this.questions = storedQuestions.rows.map((row) => ({
            id: row.get('id'),
            question: row.get('question')
        }));
    }
}

container.questions = new QuestionManager();
