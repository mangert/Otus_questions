import type { ApiError } from '@mini-survey/shared';
import cors from 'cors';
import type { ErrorRequestHandler } from 'express';
import express from 'express';

import { corsOrigins } from './config.js';
import { questions } from './questions.js';
import { saveSubmission } from './submissions.js';
import { validateSubmitAnswersRequest } from './validation.js';

const jsonBodyLimit = '32kb';

export const app = express();

app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: jsonBodyLimit }));

app.get('/questions', (_request, response) => {
  response.status(200).json(questions);
});

app.post('/answers', (request, response) => {
  if (!request.is('application/json')) {
    const error: ApiError = {
      error: 'Content-Type должен быть application/json.',
    };
    response.status(415).json(error);
    return;
  }

  const validation = validateSubmitAnswersRequest(request.body as unknown);

  if (!validation.valid) {
    const error: ApiError = { error: validation.error };
    response.status(400).json(error);
    return;
  }

  saveSubmission(validation.value);
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
        : status === 413
          ? 'Тело запроса превышает допустимый размер.'
          : status < 500
            ? 'Некорректный запрос.'
            : 'Внутренняя ошибка сервера.',
  };

  response.status(status).json(body);
};

app.use(errorHandler);
