// Tests parsing and fallback behavior for backend CORS configuration.

import { describe, expect, it } from 'vitest';

import { defaultCorsOrigins, parseCorsOrigins } from '../src/config.js';

describe('parseCorsOrigins', () => {
  it.each([undefined, '', ' ,  , '])(
    'uses local development origins when the value is empty (%#)',
    (value) => {
      expect(parseCorsOrigins(value)).toEqual(defaultCorsOrigins);
    },
  );

  it('parses and trims comma-separated origins', () => {
    expect(
      parseCorsOrigins(
        ' https://survey.example.com,https://admin.example.com ',
      ),
    ).toEqual(['https://survey.example.com', 'https://admin.example.com']);
  });

  it('ignores empty entries and removes duplicate origins', () => {
    expect(
      parseCorsOrigins(
        'https://survey.example.com,, https://survey.example.com',
      ),
    ).toEqual(['https://survey.example.com']);
  });
});
