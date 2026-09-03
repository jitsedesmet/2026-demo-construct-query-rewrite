/**
 * @fileoverview Transformation module exports for SPARQL query rewriting.
 *
 * This is a trimmed copy of the upstream barrel: only the passes the demo's pipeline runs are vendored
 * here. See https://github.com/jitsedesmet/2025-query-rewriting-1-2 for the full set.
 *
 * - **rewriteSinglePattern**: rewrites a single triple pattern against a mapping definition.
 * - **transformFilterFalse**: removes FILTER(FALSE) patterns and the structures containing them (UNION
 *   identity, JOIN absorbing element).
 * - **pushDownAssertions**: pushes assertion filters (`FILTER(sameTerm(?x, c))`) as deep into the plan as
 *   possible, substituting into BGPs, pruning VALUES rows and UNION branches, and turning an OPTIONAL over
 *   an asserted variable into a plain join.
 * - **pullUpExtends**: the mirror of the pushdown, floating the `BIND`s it left behind at the leaves back up
 *   the plan and deleting the ones nothing above reads - a UNION every branch of which carries the same
 *   bind included.
 * - **removeProjections**: flattens the sub-SELECTs the rewriting nests, renaming what each of them hid to
 *   a fresh name so that dropping it leaks nothing into the scope around it.
 * @module transformations
 */
export { transformFilterFalse } from './filterFalse.js';
export { rewriteSinglePattern } from './rewriteSinglePattern.js';
export { pushDownAssertions } from './pushDownAssertions.js';
export { pullUpExtends } from './pullUpExtends.js';
export { removeProjections } from './removeProjections.js';
