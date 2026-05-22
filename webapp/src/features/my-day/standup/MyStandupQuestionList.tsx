import type { ReactElement } from 'react';

import type { StandupQuestion } from '@/types/domain';

import { MyStandupQuestionField } from './MyStandupQuestionField';
import type { AnswerDrafts, MyStandupQuestionChangeHandler } from './my-standup.types';

/**
 * MyStandupQuestionListProps contains dynamic standup questions and answers.
 */
type MyStandupQuestionListProps = {
	readonly questions: readonly StandupQuestion[];
	readonly answers: AnswerDrafts;
	readonly disabled: boolean;
	readonly onAnswerChange: MyStandupQuestionChangeHandler;
};

/**
 * MyStandupQuestionList renders the current standup template questions.
 */
export function MyStandupQuestionList(props: MyStandupQuestionListProps): ReactElement {
	return (
		<div className="cf:grid cf:gap-4">
			{props.questions.map(question => (
				<MyStandupQuestionField
					key={question.id}
					question={question}
					value={props.answers[question.id]}
					disabled={props.disabled}
					onChange={value => props.onAnswerChange(question.id, value)}
				/>
			))}
		</div>
	);
}
