
export function cleanVersion(version: string): string {
	// Remove the caret (^) and tilde (~) from the version string
	version = version.replace(/^\D*/, '');
	// Remove any trailing characters that are not numbers or dots
	version = version.replace(/[^\d.]*$/, '');
	// Remove any leading characters that are not numbers or dots
	version = version.replace(/^[^\d.]*/, '');
	// Remove any leading zeros from the version string
	version = version.replaceAll(/^0+/g, '');

	return version;
}
