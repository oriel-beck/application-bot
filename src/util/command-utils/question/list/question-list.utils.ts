import { Colors, EmbedBuilder } from "discord.js";
import type { Question } from "../../../../types";

export function generateQuestionListEmbed(questions: Question[]) {
    return [
        new EmbedBuilder()
            .setTitle(`Listing ${questions.length} questions`)
            .setColor(Colors.Blurple)
            .setDescription(questions.map((q) => `ID: ${q.id}\nQ: ${q.question}`).join('---\n'))
    ]
}

// TODO: pagination
export function generateComponents() { }