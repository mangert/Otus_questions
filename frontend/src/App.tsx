import type {
  GetQuestionsResponse,
  SubmitAnswersRequest,
} from '@mini-survey/shared';
import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

import { ApiClientError, apiClient } from './api';
import './styles.css';

type QuestionsState =
  | { status: 'loading' }
  | { status: 'success'; questions: GetQuestionsResponse }
  | { status: 'error'; message: string };

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof ApiClientError ? error.message : fallback;
const questionsLoadErrorMessage =
  'Не удалось загрузить вопросы. Проверьте соединение и попробуйте ещё раз.';

export function App() {
  const [questionsState, setQuestionsState] = useState<QuestionsState>({
    status: 'loading',
  });
  const [answerValues, setAnswerValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const submissionInProgress = useRef(false);
  const isMounted = useRef(false);
  const loadRequestId = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    const requestId = ++loadRequestId.current;

    void apiClient
      .getQuestions()
      .then<QuestionsState>((questions) => ({
        status: 'success',
        questions,
      }))
      .catch<QuestionsState>((error: unknown) => ({
        status: 'error',
        message: getErrorMessage(error, questionsLoadErrorMessage),
      }))
      .then((nextState) => {
        if (isMounted.current && requestId === loadRequestId.current) {
          setQuestionsState(nextState);
        }
      });

    return () => {
      isMounted.current = false;
    };
  }, [loadAttempt]);

  const retryQuestions = (): void => {
    setQuestionsState({ status: 'loading' });
    setLoadAttempt((currentAttempt) => currentAttempt + 1);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
    questions: GetQuestionsResponse,
  ): Promise<void> => {
    event.preventDefault();

    if (submissionInProgress.current) {
      return;
    }

    submissionInProgress.current = true;
    setIsSubmitting(true);
    setSubmissionError(null);

    const request: SubmitAnswersRequest = {
      answers: questions.map(({ id }) => ({
        questionId: id,
        value: answerValues[id] ?? '',
      })),
    };

    try {
      await apiClient.submitAnswers(request);
      if (isMounted.current) {
        setIsSubmitted(true);
      }
    } catch (error) {
      if (isMounted.current) {
        setSubmissionError(
          getErrorMessage(
            error,
            'Не удалось отправить ответы. Попробуйте ещё раз.',
          ),
        );
      }
    } finally {
      submissionInProgress.current = false;

      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <main className="app-shell">
      <section className="survey-card">
        <h1>Мини-анкета</h1>
        <p className="survey-intro">
          Несколько коротких вопросов — и можно продолжать обучение.
        </p>

        {questionsState.status === 'loading' && (
          <p className="status-message loading-message" role="status">
            Загружаем вопросы…
          </p>
        )}

        {questionsState.status === 'success' && !isSubmitted && (
          <form
            aria-label="Вопросы анкеты"
            className="survey-form"
            onSubmit={(event) => {
              void handleSubmit(event, questionsState.questions);
            }}
          >
            {questionsState.questions.map((question) => {
              const inputId = `answer-${question.id}`;

              return (
                <div className="form-field" key={question.id}>
                  <label className="form-label" htmlFor={inputId}>
                    {question.text}
                  </label>
                  <input
                    className="form-input"
                    disabled={isSubmitting}
                    id={inputId}
                    name={question.id}
                    onChange={(event) => {
                      setSubmissionError(null);
                      setAnswerValues((currentValues) => ({
                        ...currentValues,
                        [question.id]: event.target.value,
                      }));
                    }}
                    placeholder="Введите ответ"
                    required
                    type="text"
                    value={answerValues[question.id] ?? ''}
                  />
                </div>
              );
            })}

            {submissionError && (
              <p className="status-message error-message" role="alert">
                {submissionError}
              </p>
            )}

            <button
              className="submit-button"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? 'Отправляем…'
                : submissionError
                  ? 'Повторить отправку'
                  : 'Отправить ответы'}
            </button>
          </form>
        )}

        {questionsState.status === 'success' && isSubmitted && (
          <div className="status-message success-message" role="status">
            <h2>Спасибо!</h2>
            <p>Ваши ответы сохранены.</p>
          </div>
        )}

        {questionsState.status === 'error' && (
          <div className="status-message error-message" role="alert">
            <p>{questionsState.message}</p>
            <button
              className="retry-button"
              onClick={retryQuestions}
              type="button"
            >
              Повторить загрузку
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
