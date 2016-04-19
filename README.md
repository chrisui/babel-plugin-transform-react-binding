<p align="center">
  😱 Experimental! 😱
</p>

# babel-plugin-transform-react-binding

Automatically memoize function binding in your react render methods.

## What?

So you want to bind (bind context OR partially apply args) functions in your React
render method? Psych! You're going to break the purity of your next components since
you're *recreating* those functions on *every* render call. To fix this you need to
do context binding elsewhere, pass extra redundant props to caller or muck about with
cumbersome boilerplate.

This plugin takes care of this for you. Write your `func.bind(this, whatever, arg)` calls. Use `event => handler(some, args, event)`
freely.

Just, stop worrying!

We will transparently bind and memoize these behind the scenes. [[Example]](https://astexplorer.net/#/JDXJSoobah/1)

> You can read more about the function binding problem [here](https://medium.com/@roman01la/avoid-partial-application-in-react-components-3c9e36d7f735#.6188frv1b).

## Installation

```sh
$ npm install babel-plugin-transform-react-binding --save-dev
```

We also leave the memoize implementation up to you allowing you to specify via the
`memoizeModule` option (see [#Options](#Options)). By default this uses the
[lru-memoize](https://www.npmjs.com/package/lru-memoize) package so you need to install
that too to get the default working.

```sh
$ npm install lru-memoize --save
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

### Options

- `cacheLimit = 500` - number of entries to keep in memoize cache PER COMPONENT
- `memoizeModule = 'lru-cache'` - module exporting memoize implementation

