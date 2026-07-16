import type { SubmitAnswersRequest } from '@mini-survey/shared';
import { describe, expect, it } from 'vitest';

import { validateSubmitAnswersRequest } from '../src/validation.js';

const createValidRequest = (): SubmitAnswersRequest => ({
  answers: [
    { questionId: 'name', value: 'Алексей' },
    { questionId: 'occupation', value: 'Разработчик' },
    { questionId: 'development-experience', value: 'Пять лет' },
    { questionId: 'course-expectations', value: 'Новые знания' },
  ],
});

const expectInvalidRequest = (body: unknown): void => {
  const result = validateSubmitAnswersRequest(body);

  expect(result.valid).toBe(false);

  if (result.valid) {
    return;
  }

  expect(result.error.trim()).not.toHaveLength(0);
};

describe('validateSubmitAnswersRequest', () => {
  it('accepts a complete set of valid answers', () => {
    const request = createValidRequest();

    expect(validateSubmitAnswersRequest(request)).toEqual({
      valid: true,
      value: request,
    });
  });

  it.each([undefined, null, {}, { answers: [] }])(
    'rejects an empty request body (%#)',
    (body) => {
      expectInvalidRequest(body);
    },
  );

  it.each(['', '   ', '\t\n'])(
    'rejects an empty answer value (%#)',
    (value) => {
      const request = createValidRequest();
      request.answers[0]!.value = value;

      expectInvalidRequest(request);
    },
  );

  it('rejects an unknown question identifier', () => {
    const request = createValidRequest();
    request.answers[0]!.questionId = 'unknown-question';

    expectInvalidRequest(request);
  });

  it('rejects a repeated question identifier', () => {
    const request = createValidRequest();
    request.answers[1]!.questionId = request.answers[0]!.questionId;

    expectInvalidRequest(request);
  });
});
