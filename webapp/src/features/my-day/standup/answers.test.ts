import { describe, expect, it } from 'vitest';

import type { StandupQuestion } from '@/shared/types/domain';
import type { TFunction } from '@/shared/i18n';

import { answersFromStored, emptyAnswers, formatListItems, parseListItems, serializeAnswer, validateAnswers } from './answers';

function question(overrides: Partial<StandupQuestion>): StandupQuestion {
	return {
		id: 'q1',
		workspaceId: 'w',
		templateId: 't',
		section: '',
		questionKey: 'k',
		label: 'Label',
		prompt: '',
		helpText: '',
		placeholder: '',
		type: 'text',
		required: false,
		showInReport: true,
		isPrivate: false,
		createsTasks: false,
		position: 0,
		sortOrder: 0,
		options: [],
		createdAt: '',
		updatedAt: '',
		...overrides,
	};
}

const t: TFunction = key => key;

describe('standup answers', () => {
	it('round-trips list items through Markdown', () => {
		expect(formatListItems(['  Fix bug ', '', 'Ship it'])).toBe('- Fix bug\n- Ship it');
		expect(parseListItems('- Fix bug\n* Ship it\n3) Review\n\n')).toEqual(['Fix bug', 'Ship it', 'Review']);
	});

	it('serializes each question type to the API value', () => {
		expect(serializeAnswer(question({ type: 'work_items' }), ['a', 'b'])).toBe(JSON.stringify('- a\n- b'));
		expect(serializeAnswer(question({ type: 'boolean' }), true)).toBe('true');
		expect(serializeAnswer(question({ type: 'number' }), '3.5')).toBe('3.5');
		expect(serializeAnswer(question({ type: 'duration' }), 'abc')).toBe('null');
		expect(serializeAnswer(question({ type: 'multi_select' }), ['x'])).toBe('["x"]');
	});

	it('restores saved answers so people can correct them', () => {
		const questions = [
			question({ id: 'a', type: 'work_items' }),
			question({ id: 'b', type: 'boolean' }),
			question({ id: 'c', type: 'number' }),
		];
		const restored = answersFromStored(questions, [
			{
				id: '1',
				submissionId: 's',
				workspaceId: 'w',
				questionId: 'a',
				valueJson: JSON.stringify('- one\n- two'),
				createdAt: '',
				updatedAt: '',
			},
			{ id: '2', submissionId: 's', workspaceId: 'w', questionId: 'b', valueJson: 'true', createdAt: '', updatedAt: '' },
		]);

		expect(restored).toEqual({ a: ['one', 'two'], b: true, c: '' });
		expect(emptyAnswers(questions)).toEqual({ a: [], b: false, c: '' });
	});

	it('flags unanswered required questions, treating boolean as always answered', () => {
		const questions = [
			question({ id: 'a', type: 'work_items', required: true, label: 'Today' }),
			question({ id: 'b', type: 'boolean', required: true }),
			question({ id: 'c', type: 'text', required: true }),
			question({ id: 'd', type: 'text', required: false }),
		];
		const errors = validateAnswers(questions, { a: ['', '  '], b: false, c: '   ', d: '' }, t);

		expect(Object.keys(errors).sort()).toEqual(['answers.a', 'answers.c']);
		expect(errors['answers.a']).toBe('myDay.standup.validation.taskItemsRequired');
	});
});
