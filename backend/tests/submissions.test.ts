import type { SubmitAnswersRequest } from '@mini-survey/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clearSubmissions,
  getSubmissions,
  saveSubmission,
} from '../src/submissions.js';

const submission: SubmitAnswersRequest = {
  answers: [{ questionId: 'name', value: 'Алексей' }],
};

beforeEach(() => {
  clearSubmissions();
});

afterEach(() => {
  clearSubmissions();
});

describe('submission storage', () => {
  it('saves submissions in memory', () => {
    saveSubmission(submission);

    expect(getSubmissions()).toEqual([submission]);
  });

  it('does not expose its internal state', () => {
    saveSubmission(submission);

    const savedSubmissions = getSubmissions();
    savedSubmissions[0]?.answers.push({
      questionId: 'occupation',
      value: 'Разработчик',
    });

    expect(getSubmissions()).toEqual([submission]);
  });

  it('clears all saved submissions', () => {
    saveSubmission(submission);

    clearSubmissions();

    expect(getSubmissions()).toEqual([]);
  });
});
