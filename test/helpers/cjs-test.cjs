// CommonJS require test
// This file is executed separately to verify CommonJS exports work correctly

const assert = require('node:assert');
const { Hookified, Eventified } = require('hookified');

async function runTests() {
	console.log('Testing CommonJS exports...');

	// Test 1: Hookified is defined
	assert(Hookified !== undefined, 'Hookified should be defined');
	assert(typeof Hookified === 'function', 'Hookified should be a function/class');
	console.log('✓ Hookified is defined and is a function');

	// Test 2: Eventified is defined
	assert(Eventified !== undefined, 'Eventified should be defined');
	assert(typeof Eventified === 'function', 'Eventified should be a function/class');
	console.log('✓ Eventified is defined and is a function');

	// Test 3: Create Hookified instance
	const hookified = new Hookified();
	assert(hookified instanceof Hookified, 'Should create Hookified instance');
	assert(typeof hookified.onHook === 'function', 'Should have onHook method');
	assert(typeof hookified.hook === 'function', 'Should have hook method');
	console.log('✓ Can create Hookified instance with correct methods');

	// Test 4: Test basic Hookified functionality
	let hookCalled = false;
	hookified.onHook('test', () => {
		hookCalled = true;
	});
	await hookified.hook('test');
	assert(hookCalled === true, 'Hook should be called');
	console.log('✓ Hookified basic functionality works');

	// Test 5: Create Eventified instance
	const eventified = new Eventified();
	assert(eventified instanceof Eventified, 'Should create Eventified instance');
	assert(typeof eventified.on === 'function', 'Should have on method');
	assert(typeof eventified.emit === 'function', 'Should have emit method');
	console.log('✓ Can create Eventified instance with correct methods');

	// Test 6: Test basic Eventified functionality
	let eventCalled = false;
	eventified.on('test', () => {
		eventCalled = true;
	});
	eventified.emit('test');
	assert(eventCalled === true, 'Event should be emitted and handled');
	console.log('✓ Eventified basic functionality works');

	console.log('\n✅ All CommonJS tests passed!');
}

runTests().catch((error) => {
	console.error('❌ CommonJS test failed:', error);
	process.exit(1);
});
