import type { ReactElement } from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * CampfireExternalLinkMetricProps contains an external URL metric.
 */
type CampfireExternalLinkMetricProps = {
	readonly label: string;
	readonly value: string;
	readonly emptyValue: string;
	readonly helper: string;
};

/**
 * CampfireExternalLinkMetric renders a Campfire metric as a clickable external link when present.
 */
export function CampfireExternalLinkMetric(props: CampfireExternalLinkMetricProps): ReactElement {
	const normalizedURL = normalizeExternalURL(props.value);

	if (normalizedURL === '') {
		return (
			<div className="campfire-metric">
				<p className="campfire-metric-label">{props.label}</p>
				<p className="campfire-metric-value">{props.emptyValue}</p>
				<p className="campfire-metric-helper">{props.helper}</p>
			</div>
		);
	}

	return (
		<a
			className="campfire-metric campfire-metric-link"
			href={normalizedURL}
			target="_blank"
			rel="noreferrer"
			title={normalizedURL}
		>
			<div className="cf:flex cf:items-start cf:justify-between cf:gap-3">
				<div className="cf:min-w-0">
					<p className="campfire-metric-label">{props.label}</p>
					<p className="campfire-metric-value">{externalLinkLabel(normalizedURL)}</p>
				</div>

				<ExternalLink className="cf:mt-1 cf:size-4 cf:shrink-0 cf:text-amber-100" />
			</div>

			<p className="campfire-metric-helper">{props.helper}</p>
		</a>
	);
}

/**
 * normalizeExternalURL adds https:// to bare external URLs.
 */
function normalizeExternalURL(value: string): string {
	const cleanValue = value.trim();

	if (cleanValue === '') {
		return '';
	}

	if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
		return cleanValue;
	}

	return `https://${cleanValue}`;
}

/**
 * externalLinkLabel returns a compact readable label for an external URL.
 */
function externalLinkLabel(value: string): string {
	try {
		const url = new URL(value);
		return url.hostname.replace(/^www\./, '');
	} catch {
		return value;
	}
}
