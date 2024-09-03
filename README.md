![Hookified](site/logo.svg)

# Hookified
Event and Middleware Hooks

## Features
- Emit Events via [Emittery](https://npmjs.com/package/emittery)
- Middleware Hooks - Easily add middleware to your library for additional functionality
- TypeScript, ESM, and Nodejs 20+

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
    await this.exec('before:myMethod2', data);
    // do something
    await this.exec('after:myMethod2', data);
    return data;
  }
}


