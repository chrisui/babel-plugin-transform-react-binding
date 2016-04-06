export default function({types: T}) {
  const callVisitor = {
    CallExpression(path) {
      if (
        T.isMemberExpression(path.node.callee)
        && T.isIdentifier(path.node.callee.property, {name: 'bind'})
      ) {
        const nextBindCall = T.callExpression(
          // TODO: Need to determine where bind & memoize cache will actually live.
          //       Is it per component or instance? What cache size?
          T.memberExpression(
            T.thisExpression(),
            T.identifier('__bind')
          ),
          [path.node.callee.object, ...path.node.arguments]
        );
        path.replaceWith(nextBindCall);
      }
    }
  };

  const renderMethodVisitor = {
    ClassMethod(path) {
      if (T.isIdentifier(path.node.key, {name: 'render'})) {
        path.traverse(callVisitor);
      }
    }
  };

  return {
    visitor: {
      // Top-level `Program` traversal due to ordering issues
      // See https://phabricator.babeljs.io/T6730 for info
      Program(path) {
        path.traverse(renderMethodVisitor);
      }
    }
  };
};
