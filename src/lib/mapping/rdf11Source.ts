import type * as RDF from '@rdfjs/types';
import { Algebra, algebraUtils, AlgebraFactory } from '@traqula/algebra-transformations-1-2';
import { DataFactory } from 'rdf-data-factory';
import type { QueryTransformation } from 'sparql-view-unfold';

/**
 * @fileoverview The one thing this demo knows that `sparql-view-unfold` does not: its sources hold RDF 1.1.
 *
 * The package rewrites a query over *views* and says nothing about what the data those views are defined on
 * may contain - a view body could perfectly well read a source that already speaks RDF 1.2. The demo's whole
 * point is the case where it cannot: the mappings describe how RDF 1.1 represents RDF 1.2, and the rewritten
 * query goes to an endpoint that would not even parse a `<<( … )>>`.
 *
 * So one rule, applied to the rewritten query: **a branch that needs a triple term to come out of the
 * source has no solutions.** There are two ways to need one, and both are local:
 *
 * - a triple term is written into a *pattern*, which then asks the source to hold one;
 * - `isTRIPLE(?x)` is asserted of an `?x` the operation below binds by reading the source.
 *
 * The second is what makes this more than a search for `<<( … )>>`. The unfolding materialises a triple term
 * into a pattern only where the unification *pinned* its positions; where it did not, all it knows is that
 * the term has to be one, and it says so with a guard. `<< <urn:s> <urn:p> ?o >>` against the identity
 * mapping pins two positions and writes `?x rdf:reifies <<( <urn:s> <urn:p> ?v )>>`, which a search for
 * triple terms finds. `?t rdf:reifies <<( ?a ?b ?c )>>` against the same mapping pins nothing and comes out
 * as `?v_0 rdf:reifies ?v_1 . FILTER(ISTRIPLE(?v_1))` - not a triple term in sight, and the same branch.
 *
 * Reading the guard is also what keeps the *legitimate* triple terms alive, which a blunter rule would not.
 * A reification mapping exists to build a triple term out of RDF 1.1 data, and says so with
 * `BIND(<<( ?s ?p ?o )>> AS ?t)`: a triple term the source never holds and never has to. The difference
 * between that and an impossible branch is only ever which variables the operation binds *from the source* -
 * hence {@link sourceBoundVariables}, and hence nothing here looks at a `<<( … )>>` outside a pattern.
 *
 * The vendored rewriting this demo used to carry said all of this in the range lattice instead: the object
 * position of a pattern took `sourceObjectRange`, `objectRange` without `Quad`, and a branch needing a
 * triple term out of the data was proven empty on the way up. That is the better place for it, and it is
 * internal to the package - a `MappingOptions` flag restoring it would delete this file.
 *
 * **Not decided here**: a mapping head fed by an aggregate. `CONSTRUCT { ?s ?p ?o } WHERE { SELECT ?s ?p
 * (MAX(?z) AS ?o) … }` puts the guard on `isTRIPLE(MAX(?z))` rather than on a variable, and the vendored
 * lattice gave an aggregate's target `objectRange` - "a type this does not track" - for the same reason.
 */

/** The factories this pass writes with; they are built once, holding no state of a rewrite. */
const AF = new AlgebraFactory();
const DF = new DataFactory();

/** The literal `false`, the condition of the `FILTER(FALSE)` the package reads as the empty multiset. */
const termFalse = DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean'));

/**
 * The empty solution multiset, which {@link filterFalseTransformation} then absorbs upwards.
 * @param operation - What it replaces, kept as its input so the node carries that operation's `pVars`
 * @returns the filter
 */
function filterFalse(operation: Algebra.Operation): Algebra.Filter {
  return AF.createFilter(operation, AF.createTermExpression(termFalse));
}

/**
 * The variables of a subtree that are bound by reading the source, and so hold whatever the source holds.
 *
 * A variable counts when it appears in a position a pattern or a path matches on, and stops counting as soon
 * as anything in the subtree *constructs* it - a `BIND` or a `VALUES` - since a constructed variable holds
 * whatever the expression builds, a triple term included. That exclusion is the whole difference between a
 * branch this pass empties and a reification mapping doing its job.
 * @param op - The subtree to read
 * @returns the names of its source-bound variables
 */
function sourceBoundVariables(op: Algebra.Operation): Set<string> {
  const fromSource = new Set<string>();
  const constructed = new Set<string>();
  const remember = (term: RDF.Term): void => {
    if (term.termType === 'Variable') {
      fromSource.add(term.value);
    }
  };
  algebraUtils.visitOperation(op, {
    // Only the positions a triple term could occupy: the subject and predicate of a triple admit none in
    // RDF 1.2 either, so a variable there is not news.
    [Algebra.Types.PATTERN]: { visitor: (pattern: Algebra.Pattern) => remember(pattern.object) },
    // A path says nothing about which type its endpoints have - `?lit ^:p ?s` legitimately starts at a
    // literal, and a zero-length path returns whatever the other end held - but both are terms it read.
    [Algebra.Types.PATH]: { visitor: (path: Algebra.Path) => {
      remember(path.subject);
      remember(path.object);
    } },
    [Algebra.Types.EXTEND]: { visitor: (extend: Algebra.Extend) => constructed.add(extend.variable.value) },
    [Algebra.Types.VALUES]: { visitor: (values: Algebra.Values) => {
      for (const variable of values.variables) {
        constructed.add(variable.value);
      }
    } },
  });
  return new Set([ ...fromSource ].filter(name => !constructed.has(name)));
}

/**
 * The conjuncts of an expression, a conjunction being written as a left-nested chain of `&&`.
 *
 * Only the top-level conjuncts are read: `isTRIPLE(?x) || φ` does not make a branch impossible, and must
 * not be mistaken for a conjunct that does.
 * @param expression - The expression to split
 * @returns its conjuncts
 */
function conjunctsOf(expression: Algebra.Expression): Algebra.Expression[] {
  if (
    expression.subType === Algebra.ExpressionTypes.OPERATOR &&
    expression.operator === '&&' &&
    expression.args.length === 2
  ) {
    return expression.args.flatMap(conjunctsOf);
  }
  return [ expression ];
}

/** The accessors that read a position of a triple term, and so demand one of their argument. */
const tripleTermAccessors = new Set([ 'subject', 'predicate', 'object' ]);

/**
 * The variable an expression reaches through, where it reads one through triple term accessors only.
 *
 * A nested triple term is asked for through a chain: `isTRIPLE(OBJECT(?x))` says `?x` is a triple term
 * *and* that the term in its object position is one too. Either way the source has to hold a triple term
 * in `?x`, so the chain is walked to the variable at its root.
 * @param expression - The expression to read
 * @returns the variable's name, or undefined where anything else stands in the way
 */
function variableReadThrough(expression: Algebra.Expression): string | undefined {
  if (expression.subType === Algebra.ExpressionTypes.TERM) {
    return expression.term.termType === 'Variable' ? expression.term.value : undefined;
  }
  if (expression.subType === Algebra.ExpressionTypes.OPERATOR && tripleTermAccessors.has(expression.operator)) {
    return variableReadThrough(expression.args[0]);
  }
  return undefined;
}

/**
 * The variable an expression asserts to be a triple term, directly or through a chain of accessors.
 * @param expression - The conjunct to read
 * @returns the variable's name, or undefined
 */
function tripleTermAssertedOf(expression: Algebra.Expression): string | undefined {
  if (expression.subType !== Algebra.ExpressionTypes.OPERATOR || expression.operator !== 'istriple') {
    return undefined;
  }
  return variableReadThrough(expression.args[0]);
}

/** Whether a pattern or a path matches on a triple term, which no RDF 1.1 source holds anywhere. */
const matchesTripleTerm = (...ends: RDF.Term[]): boolean => ends.some(term => term.termType === 'Quad');

/**
 * The pipeline step emptying every branch that needs a triple term out of an RDF 1.1 source.
 *
 * It belongs after the passes that resolve the guards onto the variables the patterns bind: the unfolding
 * states one over the head variable of the merged mapping, which is a `BIND`, and only the pushdown drives
 * it down to the `?mi_*` a pattern binds in each branch. Before `removeProjections`, so that the
 * `FILTER(FALSE)`s are absorbed while the plan still has its scopes.
 * @returns the transformation
 */
export function nullifyTripleTermsFromSourceTransformation(): QueryTransformation {
  return (_context, operation) => algebraUtils.mapOperation<'unsafe', Algebra.Operation>(operation, {
    [Algebra.Types.BGP]: { transform: bgp =>
      bgp.patterns.some(pattern => matchesTripleTerm(pattern.subject, pattern.object)) ?
        filterFalse(AF.createBgp([])) :
        bgp,
    },
    [Algebra.Types.PATH]: { transform: path =>
      matchesTripleTerm(path.subject, path.object) ? filterFalse(AF.createBgp([])) : path,
    },
    [Algebra.Types.FILTER]: { transform: (filter) => {
      const asserted = conjunctsOf(filter.expression)
        .map(conjunct => tripleTermAssertedOf(conjunct))
        .filter(name => name !== undefined);
      if (asserted.length === 0) {
        return filter;
      }
      const fromSource = sourceBoundVariables(filter.input);
      return asserted.some(name => fromSource.has(name)) ? filterFalse(filter) : filter;
    } },
  });
}
