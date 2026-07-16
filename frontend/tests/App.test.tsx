import type { GetQuestionsResponse } from '@mini-survey/shared';
import { cleanup, render, screen, within } from '@testing-library/react';
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
    vi.spyOn(apiClient, 'getQuestions').mockImplementation(
      () => new Promise(() => undefined),
    );

    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('Загружаем вопросы…');
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
      expect(input).toBeRequired();
      expect(input).toHaveAttribute('id', `answer-${question.id}`);
      expect(input).toHaveAttribute('name', question.id);
      expect(input).toHaveAttribute('type', 'text');
    }

    expect(getQuestions).toHaveBeenCalledOnce();
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
    const getQuestions = vi
      .spyOn(apiClient, 'getQuestions')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(questions);

    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Не удалось загрузить вопросы. Проверьте соединение и попробуйте ещё раз.',
    );

    await user.click(
      within(alert).getByRole('button', { name: 'Повторить загрузку' }),
    );

    expect(
      await screen.findByRole('form', { name: 'Вопросы анкеты' }),
    ).toBeInTheDocument();
    expect(getQuestions).toHaveBeenCalledTimes(2);
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
