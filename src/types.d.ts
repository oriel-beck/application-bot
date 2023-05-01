export interface Application {
    user: bigint;
    questions: string[];
    answers: string[];
    message: bigint;
}

export interface Blacklist {
    user: bigint;
    reason: string;
    mod: bigint;
}

export interface Setting {
    guild: bigint;
    enabled: boolean;
}

export interface Question {
    question: string;
    id: string;
}