import type { ReactElement, ReactNode } from 'react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { cn } from '@/lib/utils';

/**
 * CampfireFormQuestionCardProps contains one spacious question block.
 */
export type CampfireFormQuestionCardProps = {
	readonly id: string;
	readonly label: string;
	readonly required?: boolean;
	readonly description?: string;
	readonly children: ReactNode;
	readonly className?: string;
};

/**
 * CampfireFormQuestionCard renders one standup/form question with consistent
 * spacing, bidi-safe labels, and no one-off nested-card styling.
 */
export function CampfireFormQuestionCard(props: CampfireFormQuestionCardProps): ReactElement {
	const description = props.description?.trim() ?? '';

	return (
		<section className={cn('campfire-form-question-card', props.className)} aria-labelledby={`${props.id}-label`}>
			<header className="campfire-form-question-card-header">
				<label id={`${props.id}-label`} htmlFor={props.id} className="campfire-form-question-card-label">
					<CampfireBidiText>{props.label}</CampfireBidiText>
					{props.required === true && <span aria-label="required">*</span>}
				</label>

				{description !== '' && (
					<p className="campfire-form-question-card-description">
						<CampfireBidiText>{description}</CampfireBidiText>
					</p>
				)}
			</header>

			<div className="campfire-form-question-card-control">{props.children}</div>
		</section>
	);
}
