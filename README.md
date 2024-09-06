<img src="site/logo.svg" alt="Hookified" height="400" align="center">

# Async Event and Middleware Hooks

[![tests](https://github.com/jaredwray/hookified/actions/workflows/tests.yaml/badge.svg)](https://github.com/jaredwray/hookified/actions/workflows/tests.yaml)
[![GitHub license](https://img.shields.io/github/license/jaredwray/hookified)](https://github.com/jaredwray/hookified/blob/master/LICENSE)
[![codecov](https://codecov.io/gh/jaredwray/hookified/graph/badge.svg?token=nKkVklTFdA)](https://codecov.io/gh/jaredwray/hookified)
[![npm](https://img.shields.io/npm/dm/hookified)](https://npmjs.com/package/hookified)
[![npm](https://img.shields.io/npm/v/hookified)](https://npmjs.com/package/hookified)

## Features
- Emit Events via [Emittery](https://npmjs.com/package/emittery)
- Async Middleware Hooks for Your Methods
- ESM and Nodejs 20+
- Maintained on a regular basis!

Special thanks to [@sindresorhus](https://github.com/sindresorhus) for the [Emittery](https://npmjs.com/package/emittery) library. 🍻

## Installation
```bash
npm install hookified --save
```

## Usage
This was built because we constantly wanted hooks and events extended on libraires we are building such as [Keyv](https://keyv.org). This is a simple way to add hooks and events (via [emittery](https://npmjs.com/package/emittery)) to your libraries.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodEmittingEvent() {
    await this.emit('message', 'Hello World'); //using Emittery
  }

  //with hooks you can pass data in and if they are subscribed via onHook they can modify the data
  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    // do something
    await this.hook('before:myMethod2', data);

    return data;
  }
}
```

You can even pass in multiple arguments to the hooks:

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    let data2 = { some: 'data2' };
    // do something
    await this.hook('before:myMethod2', data, data2);

    return data;
  }
}
```

## API

Please see the [Emittery](https://npmjs.com/package/emittery) documentation for more information on the event emitter.

### .onHook(eventName, handler)

Subscribe to a hook event.

### .removeHook(eventName)

Unsubscribe from a hook event.

### .hook(eventName, ...args)

Run a hook event.

### .hooks

Get all hooks.

### .getHooks(eventName)

Get all hooks for an event.

### .clearHooks(eventName)

## Development and Testing

Hookified is written in TypeScript and tests are written in `vitest`. To run the tests, use the following command:

To setup the environment and run the tests:

```bash
npm i && npm test
```

To contribute follow the [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT & © Jared Wray](LICENSE)




