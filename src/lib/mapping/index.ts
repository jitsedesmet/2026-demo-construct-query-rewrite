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
import {
  pullUpExtends,
  pushDownAssertions,
  removeProjections,
  transformFilterFalse,
} from './transformations/index.js';

/**
 * One pass of the pipeline, together with how the demo names it in the step slider.
 */
interface Pass {
  /** Short name of the pass, shown as the slider's step label */
  label: string;
  /** One line on what this pass does to the query */
  description: string;
  /** The pass itself */
  apply: (c: TransformContext, op: Algebra.Operation) => Algebra.Operation;
}

/**
 * The pipeline the demo runs, in order.
 *
 * `transformFilterFalse` is interleaved between the heavier passes: each of them can leave `FILTER(FALSE)`
 * behind (a pattern no mapping can produce, a UNION branch pruned by an assertion), and collapsing those
 * before the next pass keeps the plan that pass has to reason over small.
 *
 * `removeProjections` runs late, and only there: the passes above read the sub-SELECTs the rewriting nests
 * as the scoping barriers they are, so flattening them earlier would take that away. Afterwards nothing
 * needs them, and one flat query is both what a reader of the demo wants to see and what an endpoint can
 * plan over.
 *
 * `pullUpExtends` then runs a second time, on what the flattening opened up. Its first run floats a `BIND`
 * no further than the projection above it, that being where the name it binds stops existing; with those
 * projections gone the same binds can travel on - and a bind that arrives somewhere nothing reads it is
 * one the pass deletes.
 */
const PASSES: Pass[] = [
  {
    label: 'Prune empty',
    description: 'Collapses any FILTER(FALSE) the user wrote, by the identities of the empty solution multiset.',
    apply: transformFilterFalse,
  },
  {
    label: 'Unfold mappings',
    description: 'Replaces every triple pattern by a UNION of sub-SELECTs, one per mapping that could produce it.',
    apply: operationTransform,
  },
  {
    label: 'Prune empty',
    description: 'Drops the branches the unfolding left empty: patterns no mapping head can ever match.',
    apply: transformFilterFalse,
  },
  {
    label: 'Push down assertions',
    description: 'Pushes FILTER(sameTerm(…)) into the patterns below it, substituting terms and pruning branches.',
    apply: pushDownAssertions,
  },
  {
    label: 'Prune empty',
    description: 'Collapses what the pushdown emptied: a branch whose assertions contradict each other.',
    apply: transformFilterFalse,
  },
  {
    label: 'Pull up binds',
    description: 'Floats the BINDs the pushdown left at the leaves back up, deleting the ones nothing reads.',
    apply: pullUpExtends,
  },
  {
    label: 'Flatten sub-SELECTs',
    description: 'Removes the projections the unfolding nested, renaming whatever each of them hid.',
    apply: removeProjections,
  },
  {
    label: 'Pull up binds',
    description: 'Runs again on what the flattening opened up: binds can now travel past the gone projections.',
    apply: pullUpExtends,
  },
];

const TRANSFORMATIONS: ((c: TransformContext, op: Algebra.Operation) => Algebra.Operation)[] =
  PASSES.map(pass => pass.apply);

/**
 * The query as it stands at one point of the pipeline - what the demo's step slider walks through.
 */
export interface RewriteStage {
  /** Short name of the step */
  label: string;
  /** One line on what the step did */
  description: string;
  /** The query after this step */
  query: string;
}

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

/**
 * Rewrites a user query, keeping the query as it stood after every step of the pipeline.
 *
 * Each step is a full run of {@link queryTransform} over a prefix of the pipeline rather than a snapshot
 * taken while one run walks it: every intermediate algebra then goes back through the same wrap-up - the
 * projection, the renaming of the `uq_` variables back to the user's own, the solution modifiers - and so
 * every step is a query that can be read, and run, on its own.
 *
 * The last stage is exactly what {@link transformQueryUsingConstructs} returns, and an error in it is
 * thrown rather than reported as a stage: that stage is the query the demo executes. A step in between
 * that cannot be rendered back to SPARQL is kept as a stage carrying the reason, so that the steps around
 * it stay reachable.
 * @param userQuery - The SPARQL 1.2 query to rewrite
 * @param mappers - CONSTRUCT queries defining how the RDF 1.2 data is represented in RDF 1.1
 * @returns the original query, the parsed query, and the query after each pass
 */
export function transformQueryStages(userQuery: string, mappers: string[]): RewriteStage[] {
  // Run the whole pipeline first: if the rewriting fails, it fails the way it does without the slider.
  const finalQuery = transformQueryUsingConstructs(userQuery, mappers);

  const stages: RewriteStage[] = [{
    label: 'Original',
    description: 'The SPARQL 1.2 query as written, before any rewriting.',
    query: userQuery.trim(),
  }];
  for (const [ index, pass ] of [ undefined, ...PASSES ].entries()) {
    const label = pass?.label ?? 'Parsed';
    const description = pass?.description ??
      'The query as the algebra sees it: property paths and blank nodes expanded, and every user variable ' +
      'namespaced so that what the mappings introduce cannot collide with it.';
    // The last stage is the one already computed - and the only one whose failure is fatal.
    if (index === PASSES.length) {
      stages.push({ label, description, query: finalQuery });
      break;
    }
    let query: string;
    try {
      // A fresh context per run: nothing of a run of the pipeline is meant to outlive it.
      query = queryTransform(
        transformContextFromConstructs(mappers),
        userQuery,
        TRANSFORMATIONS.slice(0, index),
      ).trim();
    } catch (error: unknown) {
      query = `# This intermediate step cannot be written back as SPARQL:\n# ${
        (<Error> error).message.split('\n').join('\n# ')}`;
    }
    stages.push({ label, description, query });
  }
  return stages;
}
