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
this is primarily a library for creating hooks and middleware for your own libraries.  Here is an example of a class that is extended using hookified.

```javascript
import { Hookified } from 'hookified';

class MyClass extends Hookified {
  constructor() {
    super();
  }

  async myMethod() {
    await this.emit('before:myMethod');
    // do something
    await this.emit('after:myMethod');
  }

  async myMethod2() Promise<any> {
    let data = { some: 'data' };
    // do something
    await this.hook('before:myMethod2', data);
    // do something
    await this.hook('after:myMethod2', data);
    return data;
  }
}


