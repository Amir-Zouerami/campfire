import { describe, expect, it } from 'vitest';

import type { StandupQuestion, StandupTemplate } from '@/shared/types/domain';

import {
	isDuplicateName,
	nextPosition,
	normalizeName,
	opensBeforeCloses,
	parseOptions,
	questionRequest,
	scheduleRequest,
} from './standupForms';

const template = (id: string, name: string): StandupTemplate => ({
	id,
	workspaceId: 'w',
	name,
	description: '',
	kind: 'daily',
	isDefault: false,
	isActive: true,
	createdBy: '',
	createdAt: '',
	updatedAt: '',
});
const question = (templateId: string, position: number): StandupQuestion => ({
	id: String(position),
	workspaceId: 'w',
	templateId,
	section: '',
	questionKey: 'q',
	label: 'q',
	prompt: 'q',
	helpText: '',
	placeholder: '',
	type: 'text',
	required: true,
	showInReport: true,
	isPrivate: false,
	createsTasks: false,
	position,
	sortOrder: position,
	options: [],
	createdAt: '',
	updatedAt: '',
});

describe('standup forms', () => {
	it('parses options uniquely from lines and commas', () => {
		expect(parseOptions('A\nB, A ,\n\nC')).toEqual(['A', 'B', 'C']);
	});

	it('detects duplicate names ignoring case, spacing and the template itself', () => {
		const templates = [template('1', 'Daily  Standup'), template('2', 'Weekly')];
		expect(normalizeName('  Daily   Standup ')).toBe('Daily Standup');
		expect(isDuplicateName(templates, 'daily standup')).toBe(true);
		expect(isDuplicateName(templates, 'daily standup', '1')).toBe(false);
	});

	it('requires opening before closing', () => {
		expect(opensBeforeCloses('09:30', '10:00')).toBe(true);
		expect(opensBeforeCloses('10:00', '10:00')).toBe(false);
		expect(opensBeforeCloses('', '10:00')).toBe(false);
	});

	it('places new questions ten after the last of the same template', () => {
		expect(nextPosition([], 'a')).toBe(10);
		expect(nextPosition([question('a', 10), question('a', 30), question('b', 90)], 'a')).toBe(40);
	});

	it('only lets work-item questions create tasks', () => {
		const values = {
			section: '',
			label: ' Q ',
			helpText: '',
			placeholder: '',
			type: 'text',
			required: true,
			showInReport: true,
			isPrivate: false,
			createsTasks: true,
			position: 10,
			optionsText: '',
		} as const;
		expect(questionRequest('t', values).createsTasks).toBe(false);
		expect(questionRequest('t', { ...values, type: 'work_items' }).createsTasks).toBe(true);
		expect(questionRequest('t', values).label).toBe('Q');
	});

	it('keeps weekly mode only for weekly schedules and never skips daily on weekly', () => {
		const values = {
			kind: 'daily',
			enabled: true,
			opensAt: '09:30',
			timeOfDay: '10:00',
			skipNonWorkingDays: true,
			weeklyMode: 'last_working_day',
		} as const;
		expect(scheduleRequest('t', values).weeklyMode).toBe('none');
		expect(scheduleRequest('t', { ...values, kind: 'weekly' }).weeklyMode).toBe('last_working_day');
		expect(scheduleRequest('t', values).skipDailyWhenWeeklyRuns).toBe(false);
	});
});
