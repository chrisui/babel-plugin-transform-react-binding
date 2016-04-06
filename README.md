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
  plugins: [babel-plugin-transform-react-binding"]
});
```