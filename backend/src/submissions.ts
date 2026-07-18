// Stores submitted survey answers in memory and exposes safe access helpers.

import type { SubmitAnswersRequest } from '@mini-survey/shared';

const submissions: SubmitAnswersRequest[] = [];

const copySubmission = (
  submission: SubmitAnswersRequest,
): SubmitAnswersRequest => ({
  answers: submission.answers.map((answer) => ({ ...answer })),
});

/** Stores a defensive copy of a survey submission. */
export const saveSubmission = (submission: SubmitAnswersRequest): void => {
  submissions.push(copySubmission(submission));
};

/** Returns defensive copies of all stored survey submissions. */
export const getSubmissions = (): SubmitAnswersRequest[] =>
  submissions.map(copySubmission);

/** Removes every stored survey submission. */
export const clearSubmissions = (): void => {
  submissions.length = 0;
};
