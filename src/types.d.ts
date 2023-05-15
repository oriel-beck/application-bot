import type { types } from "cassandra-driver";
import type { ApplicationStateKeys } from "./constants/application";

export interface Application {
    user: types.Long;
    questions: string[];
    answers: string[];
    message: types.Long;
    state: ApplicationStateKeys;
}

export interface Blacklist {
    user: types.Long;
    reason: string;
    mod: types.Long;
}

export interface Setting {
    guild: types.Long;
    enabled: boolean;
}

export interface Question {
    question: string;
    id: string;
}