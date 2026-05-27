import { canAccessFile } from "@lib/util.js";
import type {
    InternationalSupportLocale,
    InternationalSupportStrings,
} from "../modules/forums/international-support.i18n.js";
import { readFile } from "fs/promises";
import { join } from "path";

const translationsPath = join(process.cwd(), "json", "international-support.json");

type TranslationEntry = Omit<InternationalSupportStrings, "aiInvokeHint"> & { aiInvokeHint?: string };

type InternationalSupportTranslations = Record<InternationalSupportLocale, TranslationEntry>;

let translations: InternationalSupportTranslations;

async function registerInternationalSupportTranslations() {
    if (!(await canAccessFile(translationsPath))) {
        throw new Error(
            `[registerInternationalSupportTranslations]: Could not find translations at ${translationsPath}`
        );
    }
    const jsonString = await readFile(translationsPath, { encoding: "utf-8" });
    translations = JSON.parse(jsonString) as InternationalSupportTranslations;
}

registerInternationalSupportTranslations().catch((err) => {
    console.error(err);
    process.exit(1);
});

export function getInternationalSupportTranslations(): InternationalSupportTranslations {
    if (!translations) {
        throw new Error(
            "[getInternationalSupportTranslations]: Translations not loaded yet; ensure register runs before use"
        );
    }
    return translations;
}
