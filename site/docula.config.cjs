const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');

module.exports.options = {
	githubPath: 'jaredwray/hookified',
	outputPath: './site/dist',
	siteTitle: 'Hookified',
	siteDescription: 'Event and Middleware Hooks for Node.js',
	siteUrl: 'https://hookified.org',
};

module.exports.onPrepare = async (config) => {
	const readmePath = path.join(process.cwd(), './README.md');
	const readmeSitePath = path.join(config.sitePath, 'README.md');
	const readme = await fs.promises.readFile(readmePath, 'utf8');
	const updatedReadme = readme.replace('![Hookified](site/logo.svg)\n\n', '');
	console.log('writing updated readme to ', readmeSitePath);
	await fs.promises.writeFile(readmeSitePath, updatedReadme);
}