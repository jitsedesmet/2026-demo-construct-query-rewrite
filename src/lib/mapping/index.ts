import {
  createQueryRewriter,
  filterFalseTransformation,
  mappingFromConstructQueries,
  nullifyJoinOverIncompatibleBoundsTransformation,
  pullUpExtendsTransformation,
  pushDownAssertionsTransformation,
  removeProjectionsTransformation,
  rewriteNonRecursivePathsTransformation,
  unfoldingTransformation,
} from 'sparql-view-unfold';
import type { QueryTransformation } from 'sparql-view-unfold';
import { nullifyTripleTermsFromSourceTransformation } from './rdf11Source.js';

/**
 * @fileoverview SPARQL query rewriting for RDF 1.2 over RDF 1.1, as this demo runs it.
 *
 * The rewriting itself lives in [`sparql-view-unfold`](https://github.com/jitsedesmet/sparql-view-unfold);
 * what is here is the demo's use of it. Two things make that more than a call:
 *
 * - the demo shows the query after *every* pass, so the pipeline is built out of the package's individual
 *   transformations rather than taken whole from `createDefaultTransformationPipeline`, each carrying the
 *   label and the line of prose the step slider renders;
 * - the demo's sources hold RDF 1.1, which the package does not assume of a view's data, so one pass of the
 *   demo's own empties the branches that would ask them for a triple term - see {@link rdf11Source}.
 * @module mapping
 * @see {@link https://w3c.github.io/rdf-interop/spec/} RDF 1.2 Interoperability Spec
 */

/**
 * The knobs of the rewriting the demo lets the reader turn, both of them defaults of the package the
 * rewriting comes from rather than of the demo.
 */
export interface RewriteOptions {
  /**
   * Whether the unfolded query counts a triple two solutions of a mapping body both produce once, the way
   * the mapped graph - a set - does, rather than twice. Costly: it deduplicates the body of every unfolded
   * pattern.
   */
  preserveCardinality?: boolean;
  /**
   * Whether the graph the mappings denote is a *generalized* RDF graph, one admitting a literal as a
   * subject and a blank node as a predicate. Off, a head variable the body could bind outside its
   * position's range costs a type test; on, those solutions keep their triples.
   */
  generalizedRdfView?: boolean;
}

/**
 * One pass of the pipeline, together with how the demo names it in the step slider.
 */
interface Pass {
  /** Short name of the pass, shown as the slider's step label */
  label: string;
  /** One line on what this pass does to the query */
  description: string;
  /** The pass itself */
  apply: QueryTransformation;
}

/**
 * The pipeline the demo runs, in order.
 *
 * It is `createDefaultTransformationPipeline` written out, so that each pass can be labelled and so that the
 * RDF 1.1 step can be slotted in where it reads best: after the pushdown has driven the unfolding's
 * `isTRIPLE` guards down onto the variables the patterns bind, and before `removeProjections` flattens the
 * scopes the emptied branches sit in.
 *
 * The order is not a preference, it is what each step needs to see. Paths are expanded *before* the
 * unfolding, which only knows triple patterns. `FILTER(FALSE)` is collapsed after every step that can
 * produce one, so the next step has less to walk. The pushdown drives terms into the leaves and the
 * pull-up floats the binds it leaves behind back out, in that order, because the pushdown is what creates
 * them. `nullifyJoinOverIncompatibleBounds` comes last, after `removeProjections` and `pullUpExtends`: it
 * reads each join operand's top-level `EXTEND` chain and halts at a `PROJECT`, so anywhere earlier it sees
 * nothing at all.
 * @param mappers - CONSTRUCT queries defining how the RDF 1.2 data is represented in RDF 1.1
 * @param options - What the mapping and the unfolding are configured with
 * @returns the passes, in the order they run
 */
function passesOver(mappers: readonly string[], options: RewriteOptions = {}): Pass[] {
  const mapping = mappingFromConstructQueries(mappers, { generalizedRdfView: options.generalizedRdfView });
  return [
    {
      label: 'Expand paths',
      description: 'Expands the non-recursive property paths into triple patterns, which is all the unfolding knows.',
      apply: rewriteNonRecursivePathsTransformation(),
    },
    {
      label: 'Unfold mappings',
      description: 'Replaces every triple pattern by a UNION of sub-SELECTs, one per mapping that could produce it.',
      apply: unfoldingTransformation(mapping, { preserveCardinality: options.preserveCardinality }),
    },
    {
      label: 'Prune empty',
      description: 'Drops the branches the unfolding left empty: patterns no mapping head can ever match.',
      apply: filterFalseTransformation(),
    },
    {
      label: 'Push down assertions',
      description: 'Pushes FILTER(sameTerm(…)) into the patterns below it, substituting terms and pruning branches.',
      apply: pushDownAssertionsTransformation(),
    },
    {
      label: 'Drop what RDF 1.1 cannot answer',
      description: 'Empties every branch that still needs a triple term out of the source, which holds RDF 1.1.',
      apply: nullifyTripleTermsFromSourceTransformation(),
    },
    {
      label: 'Prune empty',
      description: 'Collapses what the pushdown emptied: a branch whose assertions contradict each other, a branch that would have asked RDF 1.1 for a triple term.',
      apply: filterFalseTransformation(),
    },
    {
      label: 'Pull up binds',
      description: 'Floats the BINDs the pushdown left at the leaves back up, deleting the ones nothing reads.',
      apply: pullUpExtendsTransformation(),
    },
    {
      label: 'Prune empty',
      description: 'Collapses what the pull-up emptied, so that the flattening below has less to walk.',
      apply: filterFalseTransformation(),
    },
    {
      label: 'Flatten sub-SELECTs',
      description: 'Removes the projections the unfolding nested, renaming whatever each of them hid.',
      apply: removeProjectionsTransformation(),
    },
    {
      label: 'Nullify impossible joins',
      description: 'Replaces a join whose branches bind one variable to two different terms by the empty result.',
      apply: nullifyJoinOverIncompatibleBoundsTransformation(),
    },
    {
      label: 'Prune empty',
      description: 'A last collapse, of what the nullification and the flattening between them emptied.',
      apply: filterFalseTransformation(),
    },
  ];
}

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
 * @param options - What the mapping and the unfolding are configured with
 * @returns the rewritten SPARQL 1.1 query
 */
export async function transformQueryUsingConstructs(
  userQuery: string,
  mappers: readonly string[],
  options: RewriteOptions = {},
): Promise<string> {
  const rewriter = createQueryRewriter(passesOver(mappers, options).map(pass => pass.apply));
  return (await rewriter.rewriteQuery(userQuery)).trim();
}

/**
 * Rewrites a user query, keeping the query as it stood after every step of the pipeline.
 *
 * Each step is a full rewrite over a prefix of the pipeline rather than a snapshot taken while one run
 * walks it: every intermediate algebra then goes back through the same wrap-up - the projection, the
 * renaming of the `uq_` variables back to the user's own, the solution modifiers - and so every step is a
 * query that can be read, and run, on its own.
 *
 * The last stage is exactly what {@link transformQueryUsingConstructs} returns, and an error in it is
 * thrown rather than reported as a stage: that stage is the query the demo executes. A step in between
 * that cannot be rendered back to SPARQL is kept as a stage carrying the reason, so that the steps around
 * it stay reachable.
 * @param userQuery - The SPARQL 1.2 query to rewrite
 * @param mappers - CONSTRUCT queries defining how the RDF 1.2 data is represented in RDF 1.1
 * @param options - What the mapping and the unfolding are configured with
 * @returns the original query, the parsed query, and the query after each pass
 */
export async function transformQueryStages(
  userQuery: string,
  mappers: readonly string[],
  options: RewriteOptions = {},
): Promise<RewriteStage[]> {
  // Run the whole pipeline first: if the rewriting fails, it fails the way it does without the slider.
  const finalQuery = await transformQueryUsingConstructs(userQuery, mappers, options);

  const stages: RewriteStage[] = [{
    label: 'Original',
    description: 'The SPARQL 1.2 query as written, before any rewriting.',
    query: userQuery.trim(),
  }];
  // A fresh mapping per stage walk, and a fresh rewriter per stage: nothing of a run is meant to outlive it.
  const passes = passesOver(mappers, options);
  for (const [ index, pass ] of [ undefined, ...passes ].entries()) {
    const label = pass?.label ?? 'Parsed';
    const description = pass?.description ??
      'The query as the algebra sees it: blank nodes expanded, and every user variable namespaced so that ' +
      'what the mappings introduce cannot collide with it.';
    // The last stage is the one already computed - and the only one whose failure is fatal.
    if (index === passes.length) {
      stages.push({ label, description, query: finalQuery });
      break;
    }
    let query: string;
    try {
      const rewriter = createQueryRewriter(passes.slice(0, index).map(earlier => earlier.apply));
      query = (await rewriter.rewriteQuery(userQuery)).trim();
    } catch (error: unknown) {
      query = `# This intermediate step cannot be written back as SPARQL:\n# ${
        (<Error> error).message.split('\n').join('\n# ')}`;
    }
    stages.push({ label, description, query });
  }
  return stages;
}
