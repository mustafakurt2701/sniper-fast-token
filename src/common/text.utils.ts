const WORD_RE = /[a-z0-9$#@]+/gi;

export const tokenize = (value: string): string[] =>
  Array.from(new Set((value.toLowerCase().match(WORD_RE) ?? []).filter((token) => token.length > 1)));

export const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const jaccardSimilarity = (left: string[], right: string[]): number => {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const union = new Set([...leftSet, ...rightSet]);

  if (union.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const item of leftSet) {
    if (rightSet.has(item)) {
      intersection += 1;
    }
  }

  return intersection / union.size;
};

export const levenshteinDistance = (left: string, right: string): number => {
  if (left === right) {
    return 0;
  }

  if (!left.length) {
    return right.length;
  }

  if (!right.length) {
    return left.length;
  }

  const matrix: number[][] = Array.from({ length: left.length + 1 }, () =>
    Array.from({ length: right.length + 1 }, () => 0),
  );

  for (let row = 0; row <= left.length; row += 1) {
    matrix[row][0] = row;
  }

  for (let column = 0; column <= right.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[left.length][right.length];
};

export const normalizedSimilarity = (left: string, right: string): number => {
  if (!left || !right) {
    return 0;
  }

  const distance = levenshteinDistance(left.toLowerCase(), right.toLowerCase());
  return 1 - distance / Math.max(left.length, right.length);
};

export const clamp = (value: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, value));
