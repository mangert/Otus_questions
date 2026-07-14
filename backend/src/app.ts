import type { ApiError, SubmitAnswersRequest } from '@mini-survey/shared';
import cors from 'cors';
import type { ErrorRequestHandler } from 'express';
import express from 'express';

import { questions } from './questions.js';
import { validateSubmitAnswersRequest } from './validation.js';

const submissions: SubmitAnswersRequest[] = [];
const localDevelopmentOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export const app = express();

app.use(cors({ origin: localDevelopmentOrigins }));
app.use(express.json());

app.get('/questions', (_request, response) => {
  response.status(200).json(questions);
});

app.post('/answers', (request, response) => {
  const validation = validateSubmitAnswersRequest(request.body as unknown);

  if (!validation.valid) {
    const error: ApiError = { error: validation.error };
    response.status(400).json(error);
    return;
  }

  submissions.push(validation.value);
  response.status(201).end();
});

const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status <= 599
      ? error.status
      : 500;

  const body: ApiError = {
    error:
      status === 400
        ? 'Запрос содержит некорректный JSON.'
        : status < 500
          ? 'Некорректный запрос.'
          : 'Внутренняя ошибка сервера.',
  };

  response.status(status).json(body);
};

app.use(errorHandler);
