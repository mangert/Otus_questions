import type { SubmitAnswersRequest } from '@mini-survey/shared';

const submissions: SubmitAnswersRequest[] = [];

const copySubmission = (
  submission: SubmitAnswersRequest,
): SubmitAnswersRequest => ({
  answers: submission.answers.map((answer) => ({ ...answer })),
});

export const saveSubmission = (submission: SubmitAnswersRequest): void => {
  submissions.push(copySubmission(submission));
};

export const getSubmissions = (): SubmitAnswersRequest[] =>
  submissions.map(copySubmission);

export const clearSubmissions = (): void => {
  submissions.length = 0;
};
