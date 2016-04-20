/**
 * New babel plugin optimising function binding in React render methods
 * @note replaces `func.bind(this, value)` calls
 * @note replaces `() => func(value)` calls
 */
export default function({types: T, template}) {
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

  // traversal trackers
  let methodHasBindCall = false;
  let moduleHasBindCall = false;
  let hoistedFuncs = [];

  /**
   * Does a given path contain react elements?
   * Eg. JSX or React.createElement() calls
   * @todo support React.createElement()
   */
  function containsReactElements(path) {
    if (T.isJSXElement(path)) {
      return true;
    }

    let doesContainJSX = false;

    path.traverse({
      JSXElement(jsxPath) {
        doesContainJSX = true;
        jsxPath.stop();
      }
    });

    return doesContainJSX;
  }

  // Find and optimise .bind() calls and () => func expressions
  const callVisitor = {
    CallExpression(path) {
      if (
        T.isMemberExpression(path.node.callee)
        && T.isIdentifier(path.node.callee.property, {name: 'bind'})
      ) {
        methodHasBindCall = moduleHasBindCall = true;

        // replace expression with optimised bind call
        path.replaceWith(T.callExpression(
          this.bindFuncIdentifier,
          [path.node.callee.object, ...path.node.arguments]
        ));
      }
    },
    ArrowFunctionExpression(path) {
      methodHasBindCall = moduleHasBindCall = true;

      const hoistedFuncIdentifier = this.insertScope.generateUidIdentifier('hoistedFunc');
      const referencedIdentifiers = [];

      // extract referenced identifiers so we can bind them
      path.get('body').traverse({
        Identifier(idPath) {
          const binding = idPath.scope.getBinding(idPath.node.name);
          const local = binding
            ? binding.scope.uid === path.scope.uid
            : false;

          if (
            // not locally bound
          !local &&
          // Don't extract nested identifiers from member expressions with
          // the exception of computed properties
          (
            !T.isMemberExpression(idPath.parentPath.node) ||
            (
              // root identifier in member expression
              idPath.parentPath.node.object.name === idPath.node.name ||
              // identifier within computed property
              idPath.parentPath.node.computed === true
            )
          )
          ) {
            referencedIdentifiers.push(idPath.node);
          }
        }
      });

      // create a function which can be hoisted from the render function
      const funcBody = T.isBlockStatement(path.node.body)
        ? path.node.body
        : T.blockStatement([
        T.returnStatement(path.node.body)
      ]);
      const hoistedFunc = T.functionDeclaration(
        hoistedFuncIdentifier,
        [...referencedIdentifiers, ...path.node.params],
        funcBody
      );

      // replace expression with optimized bind call
      path.replaceWith(T.callExpression(
        this.bindFuncIdentifier,
        [hoistedFuncIdentifier, T.thisExpression(), ...referencedIdentifiers]
      ));

      hoistedFuncs.push(hoistedFunc);
    }
  };

  /** Traverse and optimise a react render function */
  function traverseRenderFunc(path, {opts: {cacheSize = DEFAULT_CACHE_SIZE} = {}}) {
    // find the appropiate location and scope for code insertion
    let insertBeforePath = path;
    while (!T.isProgram(insertBeforePath.parentPath)) {
      insertBeforePath = insertBeforePath.parentPath;
    }
    const insertScope = insertBeforePath.scope;

    // Create a new memoized function binder
    const bindFuncIdentifier = insertScope.generateUidIdentifier('bindRenderFunc');
    const bindFunc = memoizeBindTemplate({
      FUNC_IDENTIFIER: bindFuncIdentifier,
      CACHE_SIZE: T.numericLiteral(cacheSize),
      MEMOIZE_IDENTIFIER: this.memoizeIdentifier
    });

    // look for calls/binds to optimized!
    path.traverse(callVisitor, {bindFuncIdentifier, insertScope});

    // insert memoize bind function and hosited functions if there are any
    if (methodHasBindCall) {
      insertBeforePath.insertBefore(bindFunc);
      methodHasBindCall = false;

      for (let i = 0; i < hoistedFuncs.length; ++i) {
        insertBeforePath.insertBefore(hoistedFuncs[i]);
      }
      hoistedFuncs = [];
    }
  }

  // look for react render methods/functions
  const renderMethodVisitor = {
    ClassMethod(path, context) {
      if (T.isIdentifier(path.node.key, {name: 'render'}) && containsReactElements(path)) {
        traverseRenderFunc.call(this, path, context);
      }
    },
    ArrowFunctionExpression(path, context) {
      if (containsReactElements(path)) {
        traverseRenderFunc.call(this, path, context);
      }
    },
    FunctionDeclaration(path, context) {
      if (containsReactElements(path)) {
        traverseRenderFunc.call(this, path, context);
      }
    },
    FunctionExpression(path, context) {
      if (containsReactElements(path)) {
        traverseRenderFunc.call(this, path, context);
      }
    }
  };

  const visitor = {
    // Top-level `Program` traversal due to ordering issues
    // See https://phabricator.babeljs.io/T6730 for info
    Program(path, {opts: {memoizeModule = DEFAULT_MEMOIZE_MODULE} = {}}) {
      const memoizeIdentifier = path.scope.generateUidIdentifier('memoize');
      path.traverse(renderMethodVisitor, {memoizeIdentifier});

      // add memoize import if needed
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
