// Tests validation of complete, malformed, unknown, and duplicate survey answers.

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

const expectInvalidRequest = (body: unknown, expectedError?: string): void => {
  const result = validateSubmitAnswersRequest(body);

  expect(result.valid).toBe(false);

  if (result.valid) {
    return;
  }

  expect(result.error.trim()).not.toHaveLength(0);

  if (expectedError !== undefined) {
    expect(result.error).toBe(expectedError);
  }
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

      expectInvalidRequest(
        request,
        'Поля questionId и value элемента answers[0] не должны быть пустыми.',
      );
    },
  );

  it('reports the index of an answer that is not an object', () => {
    const request = createValidRequest() as unknown as { answers: unknown[] };
    request.answers[2] = null;

    expectInvalidRequest(request, 'Элемент answers[2] должен быть объектом.');
  });

  it('reports the index of an answer with non-string fields', () => {
    const request = createValidRequest();
    const body = {
      answers: request.answers.map((answer, index) =>
        index === 2 ? { ...answer, value: 42 } : answer,
      ),
    };

    expectInvalidRequest(
      body,
      'Поля questionId и value элемента answers[2] должны быть строками.',
    );
  });

  it('rejects an unknown question identifier', () => {
    const request = createValidRequest();
    request.answers[2]!.questionId = 'unknown-question';

    expectInvalidRequest(
      request,
      'Элемент answers[2] содержит неизвестный questionId.',
    );
  });

  it('rejects a repeated question identifier', () => {
    const request = createValidRequest();
    request.answers[1]!.questionId = request.answers[0]!.questionId;

    expectInvalidRequest(
      request,
      'Элемент answers[1] содержит повторяющийся questionId.',
    );
  });
});
