import { describe, expect, it } from 'vitest';

import type { StandupAnswer, StandupQuestion } from '@/shared/types/domain';

import { answerNeedsAttention, answerText } from './answers';

const answer = (valueJson: string): StandupAnswer => ({
	id: 'a',
	submissionId: 's',
	workspaceId: 'w',
	questionId: 'q',
	valueJson,
	createdAt: '',
	updatedAt: '',
});
const question = (label: string): StandupQuestion => ({
	id: 'q',
	workspaceId: 'w',
	templateId: 't',
	section: '',
	questionKey: '',
	label,
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
});

describe('team standup answers', () => {
	it('renders each stored type for reading', () => {
		expect(answerText('"- one\\n- two"', 'Yes', 'No')).toBe('- one\n- two');
		expect(answerText('true', 'Yes', 'No')).toBe('Yes');
		expect(answerText('["a","b"]', 'Yes', 'No')).toBe('a, b');
		expect(answerText('12', 'Yes', 'No')).toBe('12');
		expect(answerText('plain text', 'Yes', 'No')).toBe('plain text');
	});

	it('flags real blockers in English and Persian but not a plain "no"', () => {
		expect(answerNeedsAttention(answer('"Waiting on infra"'), question('Do you have any blockers or risks?'))).toBe(true);
		expect(answerNeedsAttention(answer('"No"'), question('Any blockers?'))).toBe(false);
		expect(answerNeedsAttention(answer('""'), question('Any blockers?'))).toBe(false);
		expect(answerNeedsAttention(answer('"منتظر دسترسی دیتابیس"'), question('آیا مانعی دارید؟'))).toBe(true);
		expect(answerNeedsAttention(answer('"I am blocked on review"'), question('What did you do?'))).toBe(true);
		expect(answerNeedsAttention(answer('"Shipped the feature"'), question('What did you do?'))).toBe(false);
	});
});
