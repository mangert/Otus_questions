/** A question displayed in the survey. */
export interface Question {
  id: string;
  text: string;
}

/** Successful response returned by GET /questions. */
export type GetQuestionsResponse =
  | [Question, Question, Question]
  | [Question, Question, Question, Question]
  | [Question, Question, Question, Question, Question];

/** A user's answer to one survey question. */
export interface Answer {
  questionId: Question['id'];
  value: string;
}

/** Request body accepted by POST /answers. */
export interface SubmitAnswersRequest {
  answers: Answer[];
}

/** POST /answers returns no body after a successful submission. */
export type SubmitAnswersResponse = void;

/** Error response returned by the API. */
export interface ApiError {
  error: string;
}
