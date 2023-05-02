import { access, readFile } from "fs/promises";

export const canAccessFile = (path: string) => access(path).then(() => true).catch(() => false);

export async function readFileToJson<T>(path: string, defaultValue: string): Promise<T> {
    const jsonString = await readFile(path, { encoding: 'utf-8' }).catch(() => defaultValue);
    return JSON.parse(jsonString);
}