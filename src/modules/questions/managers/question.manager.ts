import { join, dirname } from "path";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from 'crypto'
import { BaseManager } from "@lib/managers/base.manager.js";
import { Question } from "@lib/types.js";
import { canAccessFile, readFileToJson } from "@lib/util.js";
import { questionsTable } from "../../../schema.js";
import { eq } from "drizzle-orm";

const jsonPaths = Object.freeze({
    rand: join(process.cwd(), 'json', 'rand-questions.json'),
    base: join(process.cwd(), 'json', 'base-questions.json')
});

export default class QuestionManager extends BaseManager {
    defaultQuestions: string[] = [];
    questions: Question[] = [];

    constructor() {
        super('questions');
        this.init();
    }

    async init() {
        await this.initBaseQuestion();
        await this.initRandomQuestions();
    }

    public async create(question: string) {
        const id = randomUUID();
        const inserted = await this.drizzle
            .insert(questionsTable)
            .values({ question, id })
            .onConflictDoNothing({ target: questionsTable.question })
            .returning({ id: questionsTable.id });
        if (inserted.at(0)?.id) return inserted.at(0)!.id;
        const [row] = await this.drizzle
            .select({ id: questionsTable.id })
            .from(questionsTable)
            .where(eq(questionsTable.question, question))
            .limit(1);
        return row?.id ?? null;
    }

    public delete(id: string) {
        return this.drizzle.delete(questionsTable).where(eq(questionsTable.id, id));
    }

    public update(id: string, field: keyof Question, value: Question[keyof Question]) {
        return this.drizzle.update(questionsTable).set({
            [field]: value
        }).where(eq(questionsTable.id, id)).returning();
    }

    public get(id: string) {
        return this.drizzle.select().from(questionsTable).where(eq(questionsTable.id, id));
    }

    public getAll() {
        return this.drizzle.select().from(questionsTable);
    }

    public getRand(max: number) {
        const head = this.defaultQuestions.slice(0, max);
        const need = max - head.length;
        if (need === 0) return head;
        const shuffled = this.randomizeQuestions();
        return head.concat(shuffled.slice(0, need).map((q) => q.question));
    }

    private randomizeQuestions() {
        const array = [...this.questions];
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

    private async getJsonQuestionsFromFile() {
        if (await canAccessFile(jsonPaths.base)) {
            return readFileToJson<string[]>(jsonPaths.base, '[]');
        }
        return [];
    }


    /**
     * Load DB → dedupe rows → merge with `rand-questions.json` (append DB-only rows to file) →
     * write JSON → insert file rows missing from DB. DB is canonical for ids that exist there.
     */
    public async initRandomQuestions() {
        await this.dedupeQuestionsInDb();

        const dbRows = await this.getAll();
        const fileRows = await this.getRandomQuestionsFromFile();

        const fromDb: Question[] = dbRows.map((r) => ({ id: r.id, question: r.question }));
        const dbIds = new Set(fromDb.map((q) => q.id));
        const dbQuestions = new Set(fromDb.map((q) => q.question));

        const fileOnly: Question[] = [];
        for (const q of fileRows) {
            if (dbIds.has(q.id)) continue;
            if (dbQuestions.has(q.question)) continue;
            fileOnly.push(q);
        }

        const merged = [...fromDb, ...fileOnly];
        await mkdir(dirname(jsonPaths.rand), { recursive: true });
        await writeFile(jsonPaths.rand, `${JSON.stringify(merged, null, 2)}\n`, "utf-8");

        const existingIds = new Set(dbRows.map((r) => r.id));
        const existingQuestions = new Set(dbRows.map((r) => r.question));
        const seenId = new Set<string>();
        const seenQuestion = new Set<string>();
        const toInsert = merged.filter((q) => {
            if (existingIds.has(q.id) || existingQuestions.has(q.question)) return false;
            if (seenId.has(q.id) || seenQuestion.has(q.question)) return false;
            seenId.add(q.id);
            seenQuestion.add(q.question);
            return true;
        });
        if (toInsert.length) {
            await this.drizzle
                .insert(questionsTable)
                .values(toInsert)
                .onConflictDoNothing({ target: questionsTable.id });
        }

        const storedQuestions = await this.getAll();
        this.questions = storedQuestions.map((row) => ({
            id: row.id,
            question: row.question
        }));
    }

    /** Remove duplicate question rows (same `question` text), keeping one row per text. */
    private async dedupeQuestionsInDb(): Promise<void> {
        const rows = await this.getAll();
        const keeperQuestion = new Map<string, string>();
        const deleteIds: string[] = [];

        for (const r of rows) {
            const dup = keeperQuestion.get(r.question);
            if (dup !== undefined) {
                deleteIds.push(r.id);
                continue;
            }
            keeperQuestion.set(r.question, r.id);
        }

        for (const id of deleteIds) {
            await this.drizzle.delete(questionsTable).where(eq(questionsTable.id, id));
        }
    }

    public async initBaseQuestion() {
        const jsonQuestios = await this.getJsonQuestionsFromFile();

        this.defaultQuestions = jsonQuestios;
    }
}