import { join } from "path";
import { BaseManager } from "./base.manager";
import { container } from '@sapphire/framework';
import { canAccessFile, readFileToJson } from '../../util/util';
import { randomUUID } from 'crypto'
import type { Question } from '../../types';

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

    public async create(question: string) {
        const uuid = randomUUID();
        await this.driver.execute(this.genInsert('id', 'question'), [uuid, question], { prepare: true });
        return uuid;
    }

    public delete(id: string) {
        return this.driver.execute(this.genDelete('id'), [id], { prepare: true });
    }

    public update(id: string, field: keyof Question, value: any) {
        return this.driver.execute(this.genUpdate(field, 'id'), [value, id], { prepare: true });
    }

    public get(id: string) {
        return this.driver.execute(this.genSelect('*', 'id'), [id], { prepare: true });
    }

    public getAll() {
        return this.driver.execute(this.genSelect(), [], { prepare: true });
    }

    public getRand(max: number) {
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
        if (await canAccessFile(jsonPaths.rand)) {
            return readFileToJson<Question[]>(jsonPaths.rand, '[]');
        }
        return [];
    }

    private getAllQuestions() {
        return this.driver.execute(this.genSelect(), [], { prepare: true })
    }

    private async getJsonQuestionsFromFile() {
        if (await canAccessFile(jsonPaths.base)) {
            return readFileToJson<string[]>(jsonPaths.base, '[]');
        }
        return [];
    }


    public async initRandomQuestions() {
        const randQuestions = await this.getRandomQuestionsFromFile();
        await Promise.all(randQuestions.map((q) => this.driver.execute('INSERT INTO appbot.questions (id, question) VALUES (?, ?) IF NOT EXISTS', [q.id, q.question])));

        const storedQuestions = await this.getAllQuestions();
        this.questions = storedQuestions.rows.map((row) => ({
            id: row.get('id'),
            question: row.get('question')
        }));
    }

    public async initBaseQuestion() {
        const jsonQuestios = await this.getJsonQuestionsFromFile();

        this.defaultQuestions = jsonQuestios;
    }
}

container.questions = new QuestionManager();
