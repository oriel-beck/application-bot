import { container } from '@sapphire/framework';
import { getInternationalSupportTranslations } from '@lib/international-support-register.js';
import type { InternationalSupportTagsConfig } from '@lib/config/config.js';

export type InternationalSupportLocale =
  'en' | 'tr' | 'ru' | 'fr' | 'es' | 'pt' | 'ar' | 'de' | 'nl' | 'hi' | 'pl' | 'it' | 'cs' | 'el' | 'hu' | 'other';

export interface InternationalSupportStrings {
  embedTitle: string;
  embedDescription: string;
  /** Shown after embedDescription — how to invoke the AI assistant */
  aiInvokeHint: string;
  footer: string;
  resolveButton: string;
  resolvedTitle: string;
  resolvedDescription: string;
  resolvedFooter: string;
  resolvedDm: string;
  noPermission: string;
  notInForum: string;
  internalError: string;
}

type TranslationEntry = Omit<InternationalSupportStrings, 'aiInvokeHint'> & { aiInvokeHint?: string };

const LOCALE_TAG_KEYS: Record<Exclude<InternationalSupportLocale, 'en'>, keyof InternationalSupportTagsConfig> = {
  tr: 'turkish',
  ru: 'russian',
  fr: 'french',
  es: 'spanish',
  pt: 'portuguese',
  ar: 'arabic',
  de: 'german',
  nl: 'dutch',
  hi: 'hindi',
  pl: 'polish',
  it: 'italian',
  cs: 'czech',
  el: 'greek',
  hu: 'hungarian',
  other: 'other'
};

export function getInternationalSupportStrings(locale: InternationalSupportLocale): InternationalSupportStrings {
  const translations = getInternationalSupportTranslations() as Record<InternationalSupportLocale, TranslationEntry>;
  const strings = translations[locale] ?? translations.en;
  return {
    ...strings,
    aiInvokeHint: strings.aiInvokeHint ?? translations.en.aiInvokeHint!
  };
}

export function formatInternationalResolvedDm(template: string, guildName: string, url: string): string {
  return template.replace('{guild}', guildName).replace('{url}', url);
}

export function detectInternationalSupportLanguage(appliedTags: string[]): InternationalSupportLocale {
  const tags = container.config.international_support_tags;
  for (const [locale, key] of Object.entries(LOCALE_TAG_KEYS) as [
    Exclude<InternationalSupportLocale, 'en'>,
    keyof InternationalSupportTagsConfig
  ][]) {
    if (appliedTags.includes(tags[key])) return locale;
  }
  return 'en';
}

export function isInternationalSupportForum(parentChannelId: string | undefined): boolean {
  return parentChannelId === container.config.channels.international_support;
}
