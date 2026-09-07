import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import type { Config } from './config.js';

const SNOWFLAKE = /^\d+$/;

const REQUIRED_CHANNELS = [
  'pending',
  'denied',
  'accepted',
  'report',
  'staff',
  'support',
  'international_support',
  'bug_reports',
  'tips',
  'wiki',
  'share_your_bot'
] as const;

const OPTIONAL_CHANNELS = ['variable_guides', 'limiter_guides', 'faq', 'bot_commands_1', 'bot_commands_2'] as const;

const REQUIRED_ROLES = ['mod', 'trial_support', 'required_role', 'staff'] as const;

const REQUIRED_SUPPORT_TAGS = ['resolved', 'complex', 'question', 'code_error', 'wiki_error'] as const;

const REQUIRED_INTERNATIONAL_SUPPORT_TAGS = [
  'resolved',
  'turkish',
  'russian',
  'french',
  'spanish',
  'portuguese',
  'arabic',
  'german',
  'dutch',
  'hindi',
  'polish',
  'italian',
  'czech',
  'greek',
  'hungarian',
  'other'
] as const;

const REQUIRED_BUG_REPORT_TAGS = ['resolved', 'website', 'app', 'bdl', 'bdfd_wiki', 'flowcharts', 'not_a_bug'] as const;

const ALWAYS_REQUIRED_ENV = [
  'BOT_TOKEN',
  'DATABASE_URL',
  'OWNER',
  'REDIS_HOST',
  'CHROMA_URL',
  'OPENAI_API_KEY'
] as const;

const POSTGRES_ENV = ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB'] as const;

export type StartupValidationResult = {
  errors: string[];
  config: Config | null;
};

type PathKind = 'missing' | 'file' | 'directory' | 'other';

async function inspectPath(path: string): Promise<PathKind> {
  try {
    const info = await stat(path);
    if (info.isFile()) return 'file';
    if (info.isDirectory()) return 'directory';
    return 'other';
  } catch {
    return 'missing';
  }
}

function isPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.includes('*****')) return true;
  if (/your_[a-z0-9_]+/i.test(trimmed)) return true;
  if (trimmed === 'YOUR_DISCORD_ID') return true;
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function expectSnowflake(value: unknown, path: string, errors: string[], optional = false): void {
  if (value === undefined) {
    if (!optional) errors.push(`${path} is required`);
    return;
  }
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${path} must be a non-empty string`);
    return;
  }
  if (!SNOWFLAKE.test(value.trim())) {
    errors.push(`${path} must be a Discord snowflake (digits only)`);
  }
}

function expectSnowflakeMap(
  value: unknown,
  path: string,
  requiredKeys: readonly string[],
  errors: string[],
  optionalKeys: readonly string[] = []
): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  for (const key of requiredKeys) {
    expectSnowflake(value[key], `${path}.${key}`, errors);
  }
  for (const key of optionalKeys) {
    if (key in value) expectSnowflake(value[key], `${path}.${key}`, errors, true);
  }
}

function validateConfigObject(data: unknown, errors: string[]): Config | null {
  if (!isRecord(data)) {
    errors.push('config.json must be a JSON object');
    return null;
  }

  expectSnowflakeMap(data.channels, 'channels', REQUIRED_CHANNELS, errors, OPTIONAL_CHANNELS);
  expectSnowflakeMap(data.roles, 'roles', REQUIRED_ROLES, errors);
  expectSnowflakeMap(data.support_tags, 'support_tags', REQUIRED_SUPPORT_TAGS, errors);
  expectSnowflakeMap(
    data.international_support_tags,
    'international_support_tags',
    REQUIRED_INTERNATIONAL_SUPPORT_TAGS,
    errors
  );
  expectSnowflakeMap(data.bug_report_tags, 'bug_report_tags', REQUIRED_BUG_REPORT_TAGS, errors);
  expectSnowflakeMap(data.categories, 'categories', ['tickets'], errors);
  expectSnowflake(data.guild, 'guild', errors);

  return data as unknown as Config;
}

async function readJsonFile(path: string, label: string, errors: string[]): Promise<unknown | undefined> {
  const kind = await inspectPath(path);
  if (kind === 'missing') {
    errors.push(`${label} is missing`);
    return undefined;
  }
  if (kind === 'directory') {
    errors.push(`${label} is a directory (bind-mount a file, not a missing path)`);
    return undefined;
  }
  if (kind !== 'file') {
    errors.push(`${label} is not a regular file`);
    return undefined;
  }

  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    errors.push(`${label} could not be read (${error instanceof Error ? error.message : 'unknown error'})`);
    return undefined;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    errors.push(`${label} is not valid JSON (${error instanceof Error ? error.message : 'parse error'})`);
    return undefined;
  }
}

function validateEnv(env: NodeJS.Dict<string>, errors: string[]): void {
  for (const key of ALWAYS_REQUIRED_ENV) {
    const value = env[key];
    if (value === undefined) {
      errors.push(`env.${key} is required`);
      continue;
    }
    if (isPlaceholder(value)) {
      errors.push(`env.${key} is empty or still a placeholder`);
    }
  }

  const databaseUrl = env.DATABASE_URL;
  if (databaseUrl && !isPlaceholder(databaseUrl) && !/^postgres(ql)?:\/\//i.test(databaseUrl.trim())) {
    errors.push('env.DATABASE_URL must start with postgres:// or postgresql://');
  }

  const owner = env.OWNER;
  if (owner && !isPlaceholder(owner) && !SNOWFLAKE.test(owner.trim())) {
    errors.push('env.OWNER must be a Discord snowflake (digits only)');
  }

  const requirePostgres = env.VALIDATE_POSTGRES === '1' || env.VALIDATE_POSTGRES === 'true';
  if (requirePostgres) {
    for (const key of POSTGRES_ENV) {
      const value = env[key];
      if (value === undefined) {
        errors.push(`env.${key} is required`);
        continue;
      }
      if (isPlaceholder(value)) {
        errors.push(`env.${key} is empty or still a placeholder`);
      }
    }
  }
}

async function validateBaseQuestions(errors: string[]): Promise<void> {
  const path = join(process.cwd(), 'json', 'base-questions.json');
  const data = await readJsonFile(path, 'json/base-questions.json', errors);
  if (data === undefined) return;
  if (!Array.isArray(data)) {
    errors.push('json/base-questions.json must be a JSON array of strings');
    return;
  }
  if (data.length === 0) {
    errors.push('json/base-questions.json must contain at least one question');
    return;
  }
  data.forEach((entry, index) => {
    if (typeof entry !== 'string' || !entry.trim()) {
      errors.push(`json/base-questions.json[${index}] must be a non-empty string`);
    }
  });
}

async function validateRandQuestions(errors: string[]): Promise<void> {
  const path = join(process.cwd(), 'json', 'rand-questions.json');
  const kind = await inspectPath(path);
  if (kind === 'missing') return;
  if (kind === 'directory') {
    errors.push('json/rand-questions.json is a directory (bind-mount a file, not a missing path)');
    return;
  }
  if (kind !== 'file') {
    errors.push('json/rand-questions.json is not a regular file');
    return;
  }

  const data = await readJsonFile(path, 'json/rand-questions.json', errors);
  if (data === undefined) return;
  if (!Array.isArray(data)) {
    errors.push('json/rand-questions.json must be a JSON array of { id, question } objects');
    return;
  }

  const seenIds = new Set<string>();
  data.forEach((entry, index) => {
    const prefix = `json/rand-questions.json[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${prefix} must be an object with id and question`);
      return;
    }
    if (typeof entry.id !== 'string' || !entry.id.trim()) {
      errors.push(`${prefix}.id must be a non-empty string`);
    } else if (seenIds.has(entry.id)) {
      errors.push(`${prefix}.id "${entry.id}" is duplicated`);
    } else {
      seenIds.add(entry.id);
    }
    if (typeof entry.question !== 'string' || !entry.question.trim()) {
      errors.push(`${prefix}.question must be a non-empty string`);
    }
  });
}

export function formatStartupValidationErrors(errors: string[]): string {
  return `Startup validation failed:\n${errors.map((error) => `- ${error}`).join('\n')}`;
}

export async function collectStartupValidation(
  env: NodeJS.Dict<string> = process.env
): Promise<StartupValidationResult> {
  const errors: string[] = [];
  const configPath = join(process.cwd(), 'config.json');
  const parsed = await readJsonFile(configPath, 'config.json', errors);
  let config: Config | null = null;
  if (parsed !== undefined) {
    const shapeErrors: string[] = [];
    config = validateConfigObject(parsed, shapeErrors);
    errors.push(...shapeErrors);
    if (shapeErrors.length) config = null;
  }

  validateEnv(env, errors);
  await validateBaseQuestions(errors);
  await validateRandQuestions(errors);

  return { errors, config };
}

export async function assertStartupValid(env: NodeJS.Dict<string> = process.env): Promise<Config> {
  const { errors, config } = await collectStartupValidation(env);
  if (errors.length) {
    throw new Error(formatStartupValidationErrors(errors));
  }
  if (!config) {
    throw new Error('Startup validation failed:\n- config.json could not be loaded');
  }
  return config;
}
