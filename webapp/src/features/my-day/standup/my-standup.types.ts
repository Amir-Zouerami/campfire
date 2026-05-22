import type { StandupQuestion } from '@/types/domain';

/**
 * AnswerDraftValue represents one editable standup answer value.
 */
export type AnswerDraftValue = string | boolean | readonly string[];

/**
 * AnswerDrafts stores editable standup answers keyed by question ID.
 */
export type AnswerDrafts = Readonly<Record<string, AnswerDraftValue>>;

/**
 * NormalizedAnswerValue is the JSON-safe value submitted to the API.
 */
export type NormalizedAnswerValue = string | boolean | readonly string[] | number | null;

/**
 * MyStandupLoadState describes the standup page data and submit state.
 */
export type MyStandupLoadState = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * MyStandupQuestionChangeHandler updates one question answer draft.
 */
export type MyStandupQuestionChangeHandler = (questionID: string, value: AnswerDraftValue) => void;

/**
 * MyStandupQuestionFieldProps contains one dynamic question renderer's data.
 */
export type MyStandupQuestionFieldProps = {
	readonly question: StandupQuestion;
	readonly value: AnswerDraftValue | undefined;
	readonly disabled: boolean;
	readonly onChange: (value: AnswerDraftValue) => void;
};
