import type {
  ApiError,
  GetQuestionsResponse,
  SubmitAnswersRequest,
} from '@mini-survey/shared';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { app } from '../src/app.js';
import { corsOrigins } from '../src/config.js';
import { questions } from '../src/questions.js';
import { clearSubmissions, getSubmissions } from '../src/submissions.js';

const validSubmission: SubmitAnswersRequest = {
  answers: [
    { questionId: 'name', value: 'Алексей' },
    { questionId: 'occupation', value: 'Разработчик' },
    { questionId: 'development-experience', value: 'Пять лет' },
    { questionId: 'course-expectations', value: 'Новые знания' },
  ],
};

beforeEach(() => {
  clearSubmissions();
});

afterEach(() => {
  clearSubmissions();
});

describe('survey API', () => {
  it('returns the configured questions with status 200', async () => {
    const response = await request(app)
      .get('/questions')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body as GetQuestionsResponse).toEqual(questions);
  });

  it('allows a configured frontend origin', async () => {
    const allowedOrigin = corsOrigins[0]!;

    await request(app)
      .get('/questions')
      .set('Origin', allowedOrigin)
      .expect('Access-Control-Allow-Origin', allowedOrigin)
      .expect(200);
  });

  it('stores valid answers and responds with status 201', async () => {
    const response = await request(app)
      .post('/answers')
      .send(validSubmission)
      .expect(201);

    expect(response.text).toBe('');
    expect(getSubmissions()).toEqual([validSubmission]);
  });

  it('rejects invalid answers with status 400 without saving them', async () => {
    const response = await request(app)
      .post('/answers')
      .send({ answers: [] })
      .expect('Content-Type', /json/)
      .expect(400);
    const body = response.body as ApiError;

    expect(body).toEqual({ error: expect.any(String) });
    expect(body.error.trim()).not.toHaveLength(0);
    expect(getSubmissions()).toEqual([]);
  });

  it('rejects malformed JSON with status 400 without saving it', async () => {
    const response = await request(app)
      .post('/answers')
      .set('Content-Type', 'application/json')
      .send('{"answers":')
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body as ApiError).toEqual({
      error: 'Запрос содержит некорректный JSON.',
    });
    expect(getSubmissions()).toEqual([]);
  });

  it('rejects a non-JSON content type with status 415', async () => {
    const response = await request(app)
      .post('/answers')
      .set('Content-Type', 'text/plain')
      .send('not json')
      .expect('Content-Type', /json/)
      .expect(415);

    expect(response.body as ApiError).toEqual({
      error: 'Content-Type должен быть application/json.',
    });
    expect(getSubmissions()).toEqual([]);
  });

  it('rejects JSON bodies larger than 32 KiB with status 413', async () => {
    const oversizedSubmission: SubmitAnswersRequest = {
      answers: validSubmission.answers.map((answer) => ({ ...answer })),
    };
    oversizedSubmission.answers[0]!.value = 'x'.repeat(33 * 1024);

    const response = await request(app)
      .post('/answers')
      .send(oversizedSubmission)
      .expect('Content-Type', /json/)
      .expect(413);
    const body = response.body as ApiError;

    expect(body).toEqual({
      error: 'Тело запроса превышает допустимый размер.',
    });
    expect(getSubmissions()).toEqual([]);
  });
});
