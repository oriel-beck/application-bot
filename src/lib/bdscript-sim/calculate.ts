/**
 * `$calculate` expressions: `+ - * / % **` and parentheses over decimal numbers. A small
 * recursive-descent parser instead of `eval`, so user code can never run as JavaScript.
 */
export function calculate(expression: string): number {
  const src = expression.replace(/\s+/g, '');
  let pos = 0;

  const fail = (): never => {
    throw new Error(`invalid expression '${expression}'`);
  };

  // power := unary ('**' power)?   (right-associative)
  // term  := power (('*' | '/' | '%') power)*
  // expr  := term (('+' | '-') term)*
  const parseExpr = (): number => {
    let value = parseTerm();
    while (src[pos] === '+' || src[pos] === '-') {
      const op = src[pos++];
      const right = parseTerm();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  };

  const parseTerm = (): number => {
    let value = parsePower();
    while ((src[pos] === '*' && src[pos + 1] !== '*') || src[pos] === '/' || src[pos] === '%') {
      const op = src[pos++];
      const right = parsePower();
      if ((op === '/' || op === '%') && right === 0) throw new Error('division by zero');
      value = op === '*' ? value * right : op === '/' ? value / right : value % right;
    }
    return value;
  };

  const parsePower = (): number => {
    const base = parseUnary();
    if (src.startsWith('**', pos)) {
      pos += 2;
      return base ** parsePower();
    }
    return base;
  };

  const parseUnary = (): number => {
    if (src[pos] === '-') {
      pos++;
      return -parseUnary();
    }
    if (src[pos] === '+') {
      pos++;
      return parseUnary();
    }
    if (src[pos] === '(') {
      pos++;
      const value = parseExpr();
      if (src[pos] !== ')') fail();
      pos++;
      return value;
    }
    const match = /^(\d+(\.\d*)?|\.\d+)/.exec(src.slice(pos));
    if (!match) return fail();
    pos += match[0].length;
    return Number(match[0]);
  };

  if (!src) fail();
  const result = parseExpr();
  if (pos !== src.length) fail();
  return result;
}
