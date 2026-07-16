import type {
  ApiError,
  GetQuestionsResponse,
  SubmitAnswersRequest,
  SubmitAnswersResponse,
} from '@mini-survey/shared';

const defaultApiUrl = 'http://localhost:3000';

export const normalizeApiUrl = (url: string): string => {
  const normalizedUrl = url.trim().replace(/\/+$/, '');

  if (normalizedUrl === '') {
    throw new Error('VITE_API_URL must not be empty.');
  }

  return normalizedUrl;
};

export const apiBaseUrl = normalizeApiUrl(
  import.meta.env.VITE_API_URL ?? defaultApiUrl,
);

export const buildApiUrl = (
  path: string,
  baseUrl: string = apiBaseUrl,
): string => {
  const normalizedPath = path.trim().replace(/^\/+/, '');

  if (normalizedPath === '') {
    throw new Error('API path must not be empty.');
  }

  return `${normalizeApiUrl(baseUrl)}/${normalizedPath}`;
};

export interface SurveyApiClient {
  getQuestions(): Promise<GetQuestionsResponse>;
  submitAnswers(request: SubmitAnswersRequest): Promise<SubmitAnswersResponse>;
}

export type FetchFunction = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const isApiError = (value: unknown): value is ApiError =>
  typeof value === 'object' &&
  value !== null &&
  'error' in value &&
  typeof value.error === 'string' &&
  value.error.trim() !== '';

const readApiErrorMessage = async (
  response: Response,
): Promise<string | undefined> => {
  try {
    const body: unknown = await response.json();
    return isApiError(body) ? body.error : undefined;
  } catch {
    return undefined;
  }
};

export class ApiClientError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class HttpSurveyApiClient implements SurveyApiClient {
  public constructor(
    private readonly baseUrl: string = apiBaseUrl,
    private readonly fetchFunction: FetchFunction = globalThis.fetch.bind(
      globalThis,
    ),
  ) {}

  public async getQuestions(): Promise<GetQuestionsResponse> {
    const response = await this.fetchFunction(
      buildApiUrl('/questions', this.baseUrl),
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
    );

    if (!response.ok) {
      throw new ApiClientError(
        (await readApiErrorMessage(response)) ??
          `GET /questions failed with HTTP status ${response.status}.`,
        response.status,
      );
    }

    return (await response.json()) as GetQuestionsResponse;
  }

  public async submitAnswers(
    request: SubmitAnswersRequest,
  ): Promise<SubmitAnswersResponse> {
    const response = await this.fetchFunction(
      buildApiUrl('/answers', this.baseUrl),
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      throw new ApiClientError(
        (await readApiErrorMessage(response)) ??
          `POST /answers failed with HTTP status ${response.status}.`,
        response.status,
      );
    }
  }
}

export const apiClient = new HttpSurveyApiClient();
