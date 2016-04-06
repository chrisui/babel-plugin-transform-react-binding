# babel-plugin-transform-react-binding

Automatically memoize function binding in your react render methods.

## Installation

```sh
$ npm install babel-plugin-transform-react-binding
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["transform-react-binding"]
}
```

### Via CLI

```sh
$ babel --plugins transform-react-binding script.js
```

### Via Node API

```javascript
require("babel-core").transform("code", {
  plugins: ["babel-plugin-transform-react-binding"]
});
```

### TODO

- [ ] Complete initial implementation with `.bind()` `CallExpression`'s
  - NB. [inline comments](https://github.com/Chrisui/babel-plugin-transform-react-binding/blob/2a380bc8bb5ab3d160a880b26bcf66fa52bca7e7/src/index.js#L9-L10)
- [ ] Support arrow functions in render methods
- [ ] Support functional components
