import { describe, expect, it } from 'vitest';
import type { BdfdApiArgument } from '@lib/bdfd-ai/bdfd-api.js';
import { checkArguments } from './arguments.js';

const arg = (type: string, extra: Partial<BdfdApiArgument> = {}): BdfdApiArgument => ({
  name: 'x',
  type,
  required: true,
  ...extra
});

describe('checkArguments', () => {
  it('lines up arguments after a mid-list repeatable argument from the end', () => {
    // $onlyForIDs[User ID;...;Error message]
    const onlyForIds = [[arg('Snowflake', { repeatable: true }), arg('String')]];
    expect(checkArguments(onlyForIds, ['111111111111111111', '222222222222222222', 'Not allowed!'])).toBeNull();
    expect(checkArguments(onlyForIds, ['nope', 'Not allowed!'])).toBe("expected snowflake in position 1, got 'nope'");

    // $sort[Number;...;Direction;Return amount;Separator]
    const sort = [
      [
        arg('Integer | Float', { repeatable: true }),
        arg('Enum', { enumData: ['asc', 'desc'] }),
        arg('Integer'),
        arg('String')
      ]
    ];
    expect(checkArguments(sort, ['8', '5', '9', '1', '3', 'asc', '4', ' - '])).toBeNull();
  });

  it('accepts unions if any member passes', () => {
    expect(checkArguments([[arg('URL | String')]], ['anything'])).toBeNull();
    expect(checkArguments([[arg('Integer | Float')]], ['2.5'])).toBeNull();
  });

  it('lets emptiable and vacantable arguments be empty, but not required or optional ones', () => {
    expect(checkArguments([[arg('String', { empty: true })]], [''])).toBeNull();
    expect(
      checkArguments([[arg('String'), arg('String', { required: false, vacantable: true })]], ['a', ''])
    ).toBeNull();
    expect(checkArguments([[arg('String'), arg('Integer', { required: false })]], ['a', ''])).toBe(
      'expected valid value in position 2, got empty value'
    );
  });

  it('treats `[]` as no arguments when every argument is optional', () => {
    expect(checkArguments([[arg('Integer', { required: false })]], [''])).toBeNull();
  });

  it('skips names without a schema', () => {
    expect(checkArguments(undefined, ['x'])).toBeNull();
  });
});
