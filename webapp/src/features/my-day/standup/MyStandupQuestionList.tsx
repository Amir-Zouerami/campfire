import { memo, useCallback } from 'react';
import type { ReactElement } from 'react';

import type { StandupQuestion, Task } from '@/types/domain';

import { MyStandupQuestionField } from './MyStandupQuestionField';
import type { AnswerDrafts, AnswerDraftValue, MyStandupQuestionChangeHandler } from './my-standup.types';

/**
 * MyStandupQuestionListProps contains dynamic standup questions and answers.
 */
type MyStandupQuestionListProps = {
	readonly questions: readonly StandupQuestion[];
	readonly answers: AnswerDrafts;
	readonly tasks: readonly Task[];
	readonly disabled: boolean;
	readonly onAnswerChange: MyStandupQuestionChangeHandler;
};

/**
 * MyStandupQuestionList renders the current standup template questions.
 */
export const MyStandupQuestionList = memo(function MyStandupQuestionList(props: MyStandupQuestionListProps): ReactElement {
	return (
		<div className="cf:grid cf:gap-4">
			{props.questions.map(question => (
				<MyStandupQuestionRow
					key={question.id}
					question={question}
					value={props.answers[question.id]}
					tasks={props.tasks}
					disabled={props.disabled}
					onAnswerChange={props.onAnswerChange}
				/>
			))}
		</div>
	);
});

/**
 * MyStandupQuestionRow binds the question ID to the shared answer handler.
 *
 * Keeping this tiny row memoized prevents every standup question from
 * re-rendering while a member types into one work-item row.
 */
const MyStandupQuestionRow = memo(function MyStandupQuestionRow(props: {
	readonly question: StandupQuestion;
	readonly value: AnswerDraftValue | undefined;
	readonly tasks: readonly Task[];
	readonly disabled: boolean;
	readonly onAnswerChange: MyStandupQuestionChangeHandler;
}): ReactElement {
	const handleChange = useCallback((value: AnswerDraftValue): void => {
		props.onAnswerChange(props.question.id, value);
	}, [props.onAnswerChange, props.question.id]);

	return (
		<MyStandupQuestionField
			question={props.question}
			value={props.value}
			tasks={props.tasks}
			disabled={props.disabled}
			onChange={handleChange}
		/>
	);
});
