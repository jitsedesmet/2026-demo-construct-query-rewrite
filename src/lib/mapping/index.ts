/**
 * @fileoverview SPARQL Query Rewriting for RDF 1.2 over RDF 1.1.
 *
 * Rewrites SPARQL 1.2 queries - which may contain triple terms and other RDF 1.2 features - into equivalent
 * SPARQL 1.1 queries that can be executed against RDF 1.1 data sources.
 *
 * **Mappings** are SPARQL CONSTRUCT queries defining how RDF 1.2 data is represented in RDF 1.1: the
 * template (head) shows the RDF 1.2 pattern, the WHERE clause (body) the equivalent RDF 1.1
 * representation. Each triple pattern of the user query is then rewritten to a UNION of subselects, one per
 * mapping that could produce matching data.
 *
 * Everything but this file is vendored from https://github.com/jitsedesmet/2025-query-rewriting-1-2,
 * trimmed to the modules the demo's pipeline reaches. Do not edit the vendored files - re-sync them.
 * @module query-rewriting-1-2
 * @see {@link https://w3c.github.io/rdf-interop/spec/} RDF 1.2 Interoperability Spec
 */
import type { Algebra } from '@traqula/algebra-transformations-1-2';
import { operationTransform, queryTransform } from './transformBgp.js';
import type { TransformContext } from './transformContext.js';
import { transformContextFromConstructs } from './transformContext.js';
import { pullUpExtends, pushDownAssertions, transformFilterFalse } from './transformations/index.js';

/**
 * The pipeline the demo runs, in order.
 *
 * `transformFilterFalse` is interleaved between the heavier passes: each of them can leave `FILTER(FALSE)`
 * behind (a pattern no mapping can produce, a UNION branch pruned by an assertion), and collapsing those
 * before the next pass keeps the plan that pass has to reason over small.
 */
const TRANSFORMATIONS: ((c: TransformContext, op: Algebra.Operation) => Algebra.Operation)[] = [
  transformFilterFalse,
  operationTransform,
  transformFilterFalse,
  pushDownAssertions,
  transformFilterFalse,
  pullUpExtends,
];

/**
 * Rewrites a user query against the mappings given as SPARQL CONSTRUCT strings.
 * @param userQuery - The SPARQL 1.2 query to rewrite
 * @param mappers - CONSTRUCT queries defining how the RDF 1.2 data is represented in RDF 1.1
 * @param transformations - The passes to run, in order; defaults to the demo's pipeline
 * @returns the rewritten SPARQL 1.1 query
 */
export function transformQueryUsingConstructs(
  userQuery: string,
  mappers: string[],
  transformations = TRANSFORMATIONS,
): string {
  const transformerContext = transformContextFromConstructs(mappers);
  return queryTransform(transformerContext, userQuery, transformations).trim();
}
