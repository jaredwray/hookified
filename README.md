<img src="site/logo.svg" alt="Hookified" height="400" align="center">

# Event and Middleware Hooks for Your Libraries

[![tests](https://github.com/jaredwray/hookified/actions/workflows/tests.yaml/badge.svg)](https://github.com/jaredwray/hookified/actions/workflows/tests.yaml)
[![GitHub license](https://img.shields.io/github/license/jaredwray/hookified)](https://github.com/jaredwray/hookified/blob/master/LICENSE)
[![codecov](https://codecov.io/gh/jaredwray/hookified/graph/badge.svg?token=nKkVklTFdA)](https://codecov.io/gh/jaredwray/hookified)
[![npm](https://img.shields.io/npm/dm/hookified)](https://npmjs.com/package/hookified)
[![npm](https://img.shields.io/npm/v/hookified)](https://npmjs.com/package/hookified)

## Features
- Emit Events via [Emittery](https://npmjs.com/package/emittery)
- Middleware Hooks with data passing
- ESM and Nodejs 20+
- Maintained on a regular basis!

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
    await this.emit('message', 'Hello World');
  }

  //with hooks you can pass data in and if they are subscribed via onHook they can modify the data
  async myMethodWithHooks() Promise<any> {
    let data = { some: 'data' };
    // do something
    await this.hook('before:myMethod2', data);

    return data;
  }
}


