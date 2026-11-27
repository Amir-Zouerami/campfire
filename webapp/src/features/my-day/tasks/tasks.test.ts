import { describe, expect, it } from 'vitest';

import type { Task } from '@/shared/types/domain';

import { buildTaskIndex, normalizeTitle } from './tasks';

function task(id: string, title: string, status: Task['status'] = 'active'): Task {
	return {
		id,
		workspaceId: 'w',
		userId: 'u',
		sourceSubmissionId: '',
		sourceAnswerId: '',
		title,
		description: '',
		projectId: '',
		categoryId: '',
		status,
		boardUrl: '',
		createdBy: '',
		createdAt: '',
		updatedAt: '',
		completedAt: '',
	};
}

describe('task index', () => {
	const index = buildTaskIndex([task('1', 'Persian translation pass'), task('2', 'Fix the Login bug'), task('3', 'Old thing', 'archived')]);

	it('matches titles regardless of case and spacing', () => {
		expect(normalizeTitle('  Fix   The BUG ')).toBe('fix the bug');
		expect(index.hasExact('fix  the login BUG')).toBe(true);
		expect(index.hasExact('fix the')).toBe(false);
	});

	it('suggests active tasks only, after two characters', () => {
		expect(index.search('p')).toEqual([]);
		expect(index.search('transl').map(item => item.id)).toEqual(['1']);
		expect(index.search('old')).toEqual([]);
	});

	it('ranks closer and unfinished matches first and hides dropped tasks', () => {
		const ranked = buildTaskIndex([
			task('inside', 'Prefixlogin cleanup'),
			task('done', 'Login audit', 'completed'),
			task('word', 'Fix login'),
			task('start', 'Login page'),
			task('dropped', 'Login spike', 'dropped'),
		]);

		expect(ranked.search('login').map(item => item.id)).toEqual(['start', 'word', 'inside', 'done']);
	});
});
