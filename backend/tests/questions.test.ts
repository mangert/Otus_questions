import { describe, expect, it } from 'vitest';

import { questions } from '../src/questions.js';

const expectedQuestionIds = [
  'name',
  'occupation',
  'development-experience',
  'course-expectations',
];

describe('questions', () => {
  it('provides the configured survey questions', () => {
    expect(questions).toEqual([
      { id: 'name', text: 'Как вас зовут?' },
      { id: 'occupation', text: 'Чем вы занимаетесь?' },
      {
        id: 'development-experience',
        text: 'Какой у вас опыт разработки?',
      },
      {
        id: 'course-expectations',
        text: 'Что вы ожидаете от этого курса?',
      },
    ]);
  });

  it('keeps question identifiers unique and immutable', () => {
    const questionIds = questions.map(({ id }) => id);

    expect(questionIds).toEqual(expectedQuestionIds);
    expect(new Set(questionIds).size).toBe(questionIds.length);
    expect(Object.isFrozen(questions)).toBe(true);
    expect(questions.every((question) => Object.isFrozen(question))).toBe(true);

    expect(Reflect.set(questions[0], 'id', 'changed-id')).toBe(false);
    expect(questions.map(({ id }) => id)).toEqual(expectedQuestionIds);
  });
});
