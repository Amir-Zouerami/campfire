import { describe, expect, it } from 'vitest';

import { safeExternalUrl } from './url';

describe('safeExternalUrl', () => {
	it('keeps web and mail links', () => {
		expect(safeExternalUrl(' https://example.com/board?a=1 ')).toBe('https://example.com/board?a=1');
		expect(safeExternalUrl('mailto:team@example.com')).toBe('mailto:team@example.com');
	});

	it('rejects script, data and malformed URLs', () => {
		expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
		expect(safeExternalUrl('JaVaScRiPt:alert(1)')).toBeNull();
		expect(safeExternalUrl('data:text/html,<script>1</script>')).toBeNull();
		expect(safeExternalUrl('not a url')).toBeNull();
		expect(safeExternalUrl('')).toBeNull();
	});
});
