// Tests survey rendering, interaction, accessibility, retries, and submission states.

import type { GetQuestionsResponse } from '@mini-survey/shared';
import { StrictMode } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '../src/App';
import { ApiClientError, apiClient } from '../src/api';

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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('App question loading', () => {
  it('shows a loading status while questions are requested', () => {
    const getQuestions = vi
      .spyOn(apiClient, 'getQuestions')
      .mockImplementation(() => new Promise(() => undefined));

    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('Загружаем вопросы…');
    expect(screen.queryByRole('form')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(getQuestions).toHaveBeenCalledOnce();
  });

  it('ignores a stale response from an earlier Strict Mode request', async () => {
    let resolveFirstRequest!: (questions: GetQuestionsResponse) => void;
    let resolveSecondRequest!: (questions: GetQuestionsResponse) => void;
    const firstRequest = new Promise<GetQuestionsResponse>((resolve) => {
      resolveFirstRequest = resolve;
    });
    const secondRequest = new Promise<GetQuestionsResponse>((resolve) => {
      resolveSecondRequest = resolve;
    });
    const getQuestions = vi
      .spyOn(apiClient, 'getQuestions')
      .mockReturnValueOnce(firstRequest)
      .mockReturnValueOnce(secondRequest);

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    expect(getQuestions).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveFirstRequest(questions);
      await firstRequest;
    });

    expect(screen.getByRole('status')).toHaveTextContent('Загружаем вопросы…');
    expect(screen.queryByRole('form')).toBeNull();

    await act(async () => {
      resolveSecondRequest(questions);
      await secondRequest;
    });

    expect(
      await screen.findByRole('form', { name: 'Вопросы анкеты' }),
    ).toBeInTheDocument();
  });

  it('renders a required labelled text field for every loaded question', async () => {
    const getQuestions = vi
      .spyOn(apiClient, 'getQuestions')
      .mockResolvedValue(questions);

    render(<App />);

    const form = await screen.findByRole('form', { name: 'Вопросы анкеты' });
    expect(within(form).getAllByRole('textbox')).toHaveLength(questions.length);

    for (const question of questions) {
      const input = within(form).getByRole('textbox', { name: question.text });
      const label = within(form).getByText(question.text, {
        selector: 'label',
      });

      expect(input).toBeRequired();
      expect(input).toHaveAttribute('id', `answer-${question.id}`);
      expect(input).toHaveAttribute('name', question.id);
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAccessibleName(question.text);
      expect(label).toHaveAttribute('for', input.id);
    }

    expect(getQuestions).toHaveBeenCalledOnce();
  });

  it('updates every answer field when the user types', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'getQuestions').mockResolvedValue(questions);
    const values = ['Мария', 'Тестировщик', 'Четыре года', 'Углубить знания'];

    render(<App />);

    const form = await screen.findByRole('form', { name: 'Вопросы анкеты' });

    for (const [index, question] of questions.entries()) {
      const input = within(form).getByRole('textbox', { name: question.text });
      expect(input).toHaveValue('');

      await user.type(input, values[index]!);

      expect(input).toHaveValue(values[index]);
    }

    for (const [index, question] of questions.entries()) {
      expect(
        within(form).getByRole('textbox', { name: question.text }),
      ).toHaveValue(values[index]);
    }
  });

  it('shows an API error message when questions cannot be loaded', async () => {
    vi.spyOn(apiClient, 'getQuestions').mockRejectedValue(
      new ApiClientError('Сервис вопросов временно недоступен.', 503),
    );

    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert).toBeVisible();
    expect(alert).toHaveTextContent('Сервис вопросов временно недоступен.');
    expect(screen.queryByRole('form')).toBeNull();
  });

  it('submits stored answers once and replaces the form after success', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'getQuestions').mockResolvedValue(questions);
    let resolveSubmission!: () => void;
    const submission = new Promise<void>((resolve) => {
      resolveSubmission = resolve;
    });
    const submitAnswers = vi
      .spyOn(apiClient, 'submitAnswers')
      .mockReturnValue(submission);

    render(<App />);

    const form = await screen.findByRole('form', { name: 'Вопросы анкеты' });
    const values = ['Алексей', 'Разработчик', 'Пять лет', 'Новые знания'];

    for (const [index, question] of questions.entries()) {
      const input = within(form).getByRole('textbox', { name: question.text });
      await user.type(input, values[index]!);
      expect(input).toHaveValue(values[index]);
    }

    const submitButton = within(form).getByRole('button', {
      name: 'Отправить ответы',
    });
    await user.click(submitButton);

    expect(submitAnswers).toHaveBeenCalledWith({
      answers: questions.map(({ id }, index) => ({
        questionId: id,
        value: values[index],
      })),
    });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Отправляем…');
    for (const input of within(form).getAllByRole('textbox')) {
      expect(input).toBeDisabled();
    }

    fireEvent.submit(form);
    await user.click(submitButton);
    expect(submitAnswers).toHaveBeenCalledOnce();

    resolveSubmission();
    expect(
      await screen.findByRole('heading', { name: 'Спасибо!' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Ваши ответы сохранены.',
    );
    expect(screen.queryByRole('form', { name: 'Вопросы анкеты' })).toBeNull();
  });

  it('shows a loading error and retries the request', async () => {
    const user = userEvent.setup();
    let resolveRetry!: (questions: GetQuestionsResponse) => void;
    const retryRequest = new Promise<GetQuestionsResponse>((resolve) => {
      resolveRetry = resolve;
    });
    const getQuestions = vi
      .spyOn(apiClient, 'getQuestions')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockReturnValueOnce(retryRequest);

    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Не удалось загрузить вопросы. Проверьте соединение и попробуйте ещё раз.',
    );

    await user.click(
      within(alert).getByRole('button', { name: 'Повторить загрузку' }),
    );

    expect(screen.getByRole('status')).toHaveTextContent('Загружаем вопросы…');
    expect(getQuestions).toHaveBeenCalledTimes(2);

    resolveRetry(questions);
    expect(
      await screen.findByRole('form', { name: 'Вопросы анкеты' }),
    ).toBeInTheDocument();
  });

  it('preserves answers and retries a failed submission', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, 'getQuestions').mockResolvedValue(questions);
    const submitAnswers = vi
      .spyOn(apiClient, 'submitAnswers')
      .mockRejectedValueOnce(new ApiClientError('Ответы не приняты.', 400))
      .mockResolvedValueOnce();

    render(<App />);

    const form = await screen.findByRole('form', { name: 'Вопросы анкеты' });
    const values = ['Анна', 'Аналитик', 'Три года', 'Практический опыт'];

    for (const [index, question] of questions.entries()) {
      await user.type(
        within(form).getByRole('textbox', { name: question.text }),
        values[index]!,
      );
    }

    await user.click(
      within(form).getByRole('button', { name: 'Отправить ответы' }),
    );

    const alert = await within(form).findByRole('alert');
    expect(alert).toBeVisible();
    expect(alert).toHaveTextContent('Ответы не приняты.');

    for (const [index, question] of questions.entries()) {
      expect(
        within(form).getByRole('textbox', { name: question.text }),
      ).toHaveValue(values[index]);
    }

    await user.click(
      within(form).getByRole('button', { name: 'Повторить отправку' }),
    );

    expect(submitAnswers).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByRole('heading', { name: 'Спасибо!' }),
    ).toBeInTheDocument();
  });
});
