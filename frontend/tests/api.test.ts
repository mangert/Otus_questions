// Tests frontend API URL handling, requests, responses, and error reporting.

import type {
  GetQuestionsResponse,
  SubmitAnswersRequest,
} from '@mini-survey/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ApiClientError,
  buildApiUrl,
  HttpSurveyApiClient,
  normalizeApiUrl,
} from '../src/api';

const questions: GetQuestionsResponse = [
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
];

const answersRequest: SubmitAnswersRequest = {
  answers: [
    { questionId: 'name', value: 'Алексей' },
    { questionId: 'occupation', value: 'Разработчик' },
    { questionId: 'development-experience', value: 'Пять лет' },
    { questionId: 'course-expectations', value: 'Новые знания' },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('API configuration', () => {
  it('normalizes whitespace and trailing slashes in the base URL', () => {
    expect(normalizeApiUrl('  http://localhost:3000///  ')).toBe(
      'http://localhost:3000',
    );
  });

  it('rejects an empty base URL', () => {
    expect(() => normalizeApiUrl('   ')).toThrow(
      'VITE_API_URL must not be empty.',
    );
  });

  it('builds an endpoint URL without duplicate slashes', () => {
    expect(buildApiUrl('/questions', 'http://localhost:3000/')).toBe(
      'http://localhost:3000/questions',
    );
  });

  it('rejects an empty API path', () => {
    expect(() => buildApiUrl('  ', 'http://localhost:3000')).toThrow(
      'API path must not be empty.',
    );
  });
});

describe('HttpSurveyApiClient.getQuestions', () => {
  it('calls the default fetch with the global object as receiver', async () => {
    const fetchFunction = vi.fn(function (this: unknown) {
      expect(this).toBe(globalThis);

      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => questions,
      } as unknown as Response);
    });
    vi.stubGlobal('fetch', fetchFunction);
    const client = new HttpSurveyApiClient('https://survey.example');

    await expect(client.getQuestions()).resolves.toEqual(questions);
    expect(fetchFunction).toHaveBeenCalledOnce();
  });

  it('gets and returns questions from the configured endpoint', async () => {
    const fetchFunction = vi.fn(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => questions,
      } as unknown as Response;
    });
    const client = new HttpSurveyApiClient(
      'https://survey.example/api/',
      fetchFunction,
    );

    await expect(client.getQuestions()).resolves.toEqual(questions);
    expect(fetchFunction).toHaveBeenCalledWith(
      'https://survey.example/api/questions',
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
    );
  });

  it('rejects with the error message returned by the API', async () => {
    const fetchFunction = vi.fn(async () => {
      return {
        ok: false,
        status: 503,
        json: async () => ({ error: 'Сервис временно недоступен.' }),
      } as unknown as Response;
    });
    const client = new HttpSurveyApiClient(
      'https://survey.example',
      fetchFunction,
    );

    await expect(client.getQuestions()).rejects.toMatchObject({
      name: 'ApiClientError',
      message: 'Сервис временно недоступен.',
      status: 503,
    } satisfies Partial<ApiClientError>);
  });

  it('uses a status fallback when the error body is not valid JSON', async () => {
    const fetchFunction = vi.fn(async () => {
      return {
        ok: false,
        status: 502,
        json: async () => Promise.reject(new SyntaxError('Invalid JSON')),
      } as unknown as Response;
    });
    const client = new HttpSurveyApiClient(
      'https://survey.example',
      fetchFunction,
    );

    await expect(client.getQuestions()).rejects.toMatchObject({
      name: 'ApiClientError',
      message: 'GET /questions failed with HTTP status 502.',
      status: 502,
    } satisfies Partial<ApiClientError>);
  });
});

describe('HttpSurveyApiClient.submitAnswers', () => {
  it('posts answers as JSON without reading the successful response body', async () => {
    const readResponseBody = vi.fn();
    const fetchFunction = vi.fn(async () => {
      return {
        ok: true,
        status: 201,
        json: readResponseBody,
      } as unknown as Response;
    });
    const client = new HttpSurveyApiClient(
      'https://survey.example/api/',
      fetchFunction,
    );

    await expect(client.submitAnswers(answersRequest)).resolves.toBeUndefined();
    expect(fetchFunction).toHaveBeenCalledWith(
      'https://survey.example/api/answers',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(answersRequest),
      },
    );
    expect(readResponseBody).not.toHaveBeenCalled();
  });

  it('rejects with the validation error returned by the API', async () => {
    const fetchFunction = vi.fn(async () => {
      return {
        ok: false,
        status: 400,
        json: async () => ({ error: 'Необходимо ответить на все вопросы.' }),
      } as unknown as Response;
    });
    const client = new HttpSurveyApiClient(
      'https://survey.example',
      fetchFunction,
    );

    await expect(client.submitAnswers(answersRequest)).rejects.toMatchObject({
      name: 'ApiClientError',
      message: 'Необходимо ответить на все вопросы.',
      status: 400,
    } satisfies Partial<ApiClientError>);
  });
});
