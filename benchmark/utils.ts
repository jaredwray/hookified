
export function cleanVersion(version: string): string {
	// Remove the caret (^) and tilde (~) from the version string
	version = version.replace(/^[^0-9]*/, '');
	// Remove any trailing characters that are not numbers or dots
	version = version.replace(/[^0-9.]*$/, '');
	// Remove any leading characters that are not numbers or dots
	version = version.replace(/^[^0-9.]*/, '');
	// Remove any leading zeros from the version string
	version = version.replace(/^[0]+/g, '');

	return version;
}