import type { GetQuestionsResponse } from '@mini-survey/shared';

export const questions = Object.freeze([
  Object.freeze({ id: 'name', text: 'Как вас зовут?' }),
  Object.freeze({ id: 'occupation', text: 'Чем вы занимаетесь?' }),
  Object.freeze({
    id: 'development-experience',
    text: 'Какой у вас опыт разработки?',
  }),
  Object.freeze({
    id: 'course-expectations',
    text: 'Что вы ожидаете от этого курса?',
  }),
] as const satisfies Readonly<GetQuestionsResponse>);
