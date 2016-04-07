import template from "babel-template";

const DEFAULT_CACHE_SIZE = 500;
const DEFAULT_MEMOIZE_MODULE = 'lru-memoize';

const memoizeBindTemplate = template(`
const FUNC_IDENTIFIER = MEMOIZE_IDENTIFIER(CACHE_SIZE)(function(func, context, ...args) {
  return func.bind(context, ...args);
});
`);

const importTemplate = template(`
const MEMOIZE_IDENTIFIER = require(MEMOIZE_MODULE);
`);

/**
 * New babel plugin replacing *.bind() calls in react render methods with
 * memoized bind calls to prevent recreation of function references
 * - New memoize cache per component (per render func)
 */
export default function({types: T}) {
  let methodHasBindCall = false;
  let moduleHasBindCall = false;

  const callVisitor = {
    CallExpression(path) {
      if (
        T.isMemberExpression(path.node.callee)
        && T.isIdentifier(path.node.callee.property, {name: 'bind'})
      ) {
        methodHasBindCall = moduleHasBindCall = true;
        path.replaceWith(T.callExpression(
          this.bindFuncIdentifier,
          [path.node.callee.object, ...path.node.arguments]
        ));
      }
    }
  };

  const renderMethodVisitor = {
    ClassMethod(path, {opts: {cacheSize = DEFAULT_CACHE_SIZE} = {}}) {
      if (T.isIdentifier(path.node.key, {name: 'render'})) {
        let insertBeforePath = path.parentPath;
        while (!T.isProgram(insertBeforePath.parentPath)) {
          insertBeforePath = insertBeforePath.parentPath;
        }

        const bindFuncIdentifier = insertBeforePath.scope.generateUidIdentifier('bindRenderFunc');
        const bindFunc = memoizeBindTemplate({
          FUNC_IDENTIFIER: bindFuncIdentifier,
          CACHE_SIZE: T.numericLiteral(cacheSize),
          MEMOIZE_IDENTIFIER: this.memoizeIdentifier
        });

        path.traverse(callVisitor, {bindFuncIdentifier});

        if (methodHasBindCall) {
          insertBeforePath.insertBefore(bindFunc);
          methodHasBindCall = false;
        }
      }
    }
  };

  const visitor = {
    // Top-level `Program` traversal due to ordering issues
    // See https://phabricator.babeljs.io/T6730 for info
    Program(path, {opts: {memoizeModule = DEFAULT_MEMOIZE_MODULE} = {}}) {
      // TODO: Find reliable "react component ast" first rather any "render" named method

      const memoizeIdentifier = path.scope.generateUidIdentifier('memoize');
      path.traverse(renderMethodVisitor, {memoizeIdentifier});

      // add memoize import
      if (moduleHasBindCall) {
        const imprt = importTemplate({
          MEMOIZE_IDENTIFIER: memoizeIdentifier,
          MEMOIZE_MODULE: T.stringLiteral(memoizeModule)
        });
        path.node.body.splice(0, 0, imprt);
        moduleHasBindCall = false;
      }
    }
  };

  return {visitor};
};
