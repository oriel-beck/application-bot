export interface Application {
    user: string;
    questions: string[];
    answers: string[];
    message: string;
    state: 'active' | 'pending' | 'denied' | 'accepted';
}

export interface Blacklist {
    user: string;
    reason: string;
    mod: string;
}

export interface Setting {
    guild: string;
    enabled: boolean;
}

export interface Question {
    question: string;
    id: string;
}