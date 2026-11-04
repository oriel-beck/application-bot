import type { BdfdApiArgument } from '@lib/bdfd-ai/bdfd-api.js';

/**
 * Argument checks driven by the official API schema, with BDFD's own error wording (from the
 * wiki's "Common BDFD Errors" page) where it's documented. Types the wiki doesn't show a check
 * for (Emoji, Color, Duration, Permission, ...) are accepted as-is rather than guessed at.
 */

const BOOL = /^(yes|no|true|false)$/i;
const INTEGER = /^-?\d+$/;
const NUMBER = /^-?(\d+(\.\d*)?|\.\d+)$/;
/** `http(s)://` plus a dotted host, as the wiki's URL type requires. */
const URL_PATTERN = /^https?:\/\/[^\s/.]+(\.[^\s/.]+)+(\/\S*)?$/i;
const SNOWFLAKE = /^\d{15,21}$/;
const HOW_MANY = /^([<>]?\d+|\d+[<>]|[<>])$/;

export function isBool(value: string): boolean {
  return BOOL.test(value);
}

export function parseBool(value: string): boolean {
  return /^(yes|true)$/i.test(value);
}

export function isInteger(value: string): boolean {
  return INTEGER.test(value);
}

export function isNumber(value: string): boolean {
  return NUMBER.test(value);
}

export function isUrl(value: string): boolean {
  return URL_PATTERN.test(value);
}

/** `null` when the value passes, otherwise the BDFD error text for it. */
function typeError(arg: BdfdApiArgument, value: string, position: number, enumData?: string[]): string | null {
  const types = arg.type.split('|').map((t) => t.trim());
  if (types.includes('String')) return null;

  const passes = (type: string): boolean | null => {
    switch (type) {
      case 'Bool':
        return isBool(value);
      case 'Integer':
        return isInteger(value);
      case 'Float':
        return isNumber(value);
      case 'URL':
        return isUrl(value);
      case 'Snowflake':
        return SNOWFLAKE.test(value);
      case 'HowMany':
        return HOW_MANY.test(value);
      case 'Enum':
        return (enumData ?? []).some((option) => option.toLowerCase() === value.toLowerCase());
      default:
        return null; // not checked
    }
  };

  const results = types.map(passes);
  if (results.some((r) => r !== false)) return null;

  const got = `got '${value}'`;
  switch (types[0]) {
    case 'Bool':
      return `expected boolean in position ${position}, ${got}`;
    case 'Integer':
      return `expected integer in position ${position}, ${got}`;
    case 'Float':
      return `expected float in position ${position}, ${got}`;
    case 'URL':
      return `expected URL in position ${position}, ${got}`;
    case 'Snowflake':
      return `expected snowflake in position ${position}, ${got}`;
    case 'Enum':
      return `expected valid enum value in position ${position}, ${got}`;
    default:
      return `expected ${types[0]} in position ${position}, ${got}`;
  }
}

/**
 * The schema for argument `i` of `count`. A repeatable argument can sit mid-list
 * (`$onlyForIDs[User ID;...;Error message]`), so arguments after it line up from the end.
 */
function schemaFor(variant: BdfdApiArgument[], i: number, count: number): BdfdApiArgument {
  const repeat = variant.findIndex((a) => a.repeatable);
  if (repeat === -1) return variant[Math.min(i, variant.length - 1)]!;
  const trailing = variant.length - repeat - 1;
  if (i < repeat) return variant[i]!;
  if (i >= count - trailing) return variant[variant.length - (count - i)]!;
  return variant[repeat]!;
}

function bounds(variant: BdfdApiArgument[]): { min: number; max: number } {
  return {
    min: variant.filter((a) => a.required).length,
    max: variant.some((a) => a.repeatable) ? Infinity : variant.length
  };
}

/**
 * Check a bracketed call's evaluated arguments against the name's API overloads. Returns the
 * BDFD error reason, or `null` when they fit. Bare calls aren't checked: the API omits some
 * bare forms that BDFD accepts, and a false error is worse than a missed one here.
 */
export function checkArguments(variants: (BdfdApiArgument[] | null)[] | undefined, args: string[]): string | null {
  if (!variants?.length) return null;
  const bracketed = variants.filter((v): v is BdfdApiArgument[] => !!v?.length);
  if (!bracketed.length) {
    // Only a bare form exists; `$fn[]` is tolerated as "no arguments".
    return args.length === 1 && args[0] === '' ? null : `expected at most 0 arguments, got ${args.length}`;
  }

  const count = args.length;
  const variant = bracketed.find((v) => {
    const { min, max } = bounds(v);
    return count >= min && count <= max;
  });

  if (!variant) {
    const { min, max } = bounds(bracketed[0]!);
    return count < min
      ? `expected at least ${min} arguments, got ${count}`
      : `expected at most ${max} arguments, got ${count}`;
  }

  for (let i = 0; i < args.length; i++) {
    const schema = schemaFor(variant, i, count);
    const value = args[i]!;
    if (value === '') {
      // `$fn[]` with only optional arguments means none were given, not one empty one.
      if (count === 1 && !schema.required) return null;
      if (schema.empty || schema.vacantable) continue;
      return `expected valid value in position ${i + 1}, got empty value`;
    }
    const error = typeError(schema, value, i + 1, schema.enumData);
    if (error) return error;
  }

  return null;
}
