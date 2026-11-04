/** `$if` / `$onlyIf` / `$checkCondition` conditions: `value1<sign>value2` with BDFD's six signs. */
const SIGNS = ['==', '!=', '>=', '<=', '>', '<'] as const;

/** `true`/`false`, or `null` when the text isn't a condition at all. */
export function evaluateCondition(condition: string): boolean | null {
  // The first sign in the text splits it, so `a==b==c` compares `a` with `b==c`.
  for (let i = 0; i < condition.length; i++) {
    const sign = SIGNS.find((s) => condition.startsWith(s, i));
    if (!sign) continue;

    const left = condition.slice(0, i);
    const right = condition.slice(i + sign.length);
    switch (sign) {
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      default: {
        const a = Number(left);
        const b = Number(right);
        // Ordering signs only make sense for numbers; anything else is simply false.
        if (left.trim() === '' || right.trim() === '' || Number.isNaN(a) || Number.isNaN(b)) return false;
        if (sign === '>=') return a >= b;
        if (sign === '<=') return a <= b;
        if (sign === '>') return a > b;
        return a < b;
      }
    }
  }

  const literal = condition.trim().toLowerCase();
  if (literal === 'true') return true;
  if (literal === 'false') return false;
  return null;
}
