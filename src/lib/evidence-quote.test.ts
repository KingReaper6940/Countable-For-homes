import { expect, test } from 'vitest';
import { quoteSupportsDate, quoteSupportsUnit } from './evidence-quote';

test('a floor number is not mistaken for an additional dwelling', () => {
  expect(quoteSupportsUnit('Work on 1ST FLOOR', 1)).toBe(false);
  expect(quoteSupportsUnit('TWO UNIT RESIDENTIAL WITH ONE UNIT ON 1ST FLOOR', 1)).toBe(true);
  expect(quoteSupportsDate('Date Issued: February 25, 2024', '2024-02-25')).toBe(true);
});
