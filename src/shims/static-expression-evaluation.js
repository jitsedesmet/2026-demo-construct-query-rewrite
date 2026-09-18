// Browser stub for sparql-view-unfold's `simplifyStaticExpressions` pass.
//
// That pass folds static expressions through Comunica's expression evaluator, which it reaches by
// bootstrapping Components.js from Node's own module resolution (`node:module`, `node:path`, `fs`). None
// of that exists in a browser, and Rollup will not drop the module even though nothing here imports the
// pass: the package's barrel re-exports it, so it is in the graph, and its `node:module` import fails to
// link against Vite's empty browser externals.
//
// The demo's pipeline does not run this pass, so the whole module is replaced here (see vite.config.ts)
// rather than its Node imports being shimmed one by one - which would keep Components.js in the bundle.
// A build that does want it needs the pass to reach Comunica without Components.js.
export function simplifyStaticExpressionsTransformation() {
  return () => {
    throw new Error(
      'simplifyStaticExpressions is not available in the browser: it bootstraps Components.js from Node.',
    );
  };
}
