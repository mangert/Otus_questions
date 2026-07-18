// Validates incoming answer submissions against the survey contract.

import type { Answer, SubmitAnswersRequest } from '@mini-survey/shared';

import { questions } from './questions.js';

export type SubmitAnswersValidationResult =
  | { valid: true; value: SubmitAnswersRequest }
  | { valid: false; error: string };

const questionIds = new Set<string>(questions.map(({ id }) => id));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validates an unknown request body and returns normalized answers or an error. */
export const validateSubmitAnswersRequest = (
  body: unknown,
): SubmitAnswersValidationResult => {
  if (!isRecord(body)) {
    return { valid: false, error: 'Тело запроса должно быть JSON-объектом.' };
  }

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return {
      valid: false,
      error: 'Поле answers должно быть непустым массивом.',
    };
  }

  const answers: Answer[] = [];
  const seenQuestionIds = new Set<string>();

  for (const [index, candidate] of body.answers.entries()) {
    if (!isRecord(candidate)) {
      return {
        valid: false,
        error: `Элемент answers[${index}] должен быть объектом.`,
      };
    }

    const { questionId, value } = candidate;

    if (typeof questionId !== 'string' || typeof value !== 'string') {
      return {
        valid: false,
        error: `Поля questionId и value элемента answers[${index}] должны быть строками.`,
      };
    }

    if (questionId.trim() === '' || value.trim() === '') {
      return {
        valid: false,
        error: `Поля questionId и value элемента answers[${index}] не должны быть пустыми.`,
      };
    }

    if (!questionIds.has(questionId)) {
      return {
        valid: false,
        error: `Элемент answers[${index}] содержит неизвестный questionId.`,
      };
    }

    if (seenQuestionIds.has(questionId)) {
      return {
        valid: false,
        error: `Элемент answers[${index}] содержит повторяющийся questionId.`,
      };
    }

    seenQuestionIds.add(questionId);
    answers.push({ questionId, value });
  }

  if (seenQuestionIds.size !== questions.length) {
    return {
      valid: false,
      error: 'Необходимо ответить на все вопросы анкеты.',
    };
  }

  return { valid: true, value: { answers } };
};
