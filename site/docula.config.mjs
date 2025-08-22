import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export const options = {
	githubPath: 'jaredwray/hookified',
	outputPath: './site/dist',
	siteTitle: 'Hookified',
	siteDescription: 'Event Emitting and Middleware Hooks for Node.js',
	siteUrl: 'https://hookified.org',
};

export const onPrepare = async config => {
	const readmePath = path.join(process.cwd(), './README.md');
	const readmeSitePath = path.join(config.sitePath, 'README.md');
	const readme = await fs.promises.readFile(readmePath, 'utf8');
	const updatedReadme = readme.replace('![Hookified](site/logo.svg)', '');
	console.log('writing updated readme to', readmeSitePath);
	await fs.promises.writeFile(readmeSitePath, updatedReadme);
};
