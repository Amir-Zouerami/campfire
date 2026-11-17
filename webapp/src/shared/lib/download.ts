/**
 * downloadBlob saves a Blob as a file through a temporary link. The object URL is released
 * after a delay, because revoking it immediately can cancel the download in some browsers.
 */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');

	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();

	window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
