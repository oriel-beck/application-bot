import { access, readFile } from "fs/promises";
import { ApplicationState } from "../constants/application";
import type { Application } from "../types";

export const canAccessFile = (path: string) => access(path).then(() => true).catch(() => false);

export async function readFileToJson<T>(path: string, defaultValue: string): Promise<T> {
    const jsonString = await readFile(path, { encoding: 'utf-8' }).catch(() => defaultValue);
    return JSON.parse(jsonString);
}

export const isCurrentApplicationMessage = (application: Application | null, msgid: string, state = ApplicationState.active) => !!application && application.message.toString() === msgid && application.state === state;
export const isApplicationExist = (application: Application | null) => !!application