import type * as RDF from '@rdfjs/types';
import { Algebra, algebraUtils, AlgebraFactory } from '@traqula/algebra-transformations-1-2';
import { DataFactory } from 'rdf-data-factory';
import { VAR_PREFIX_USER_QUERY } from 'sparql-view-unfold';
import type { Mapping, QueryTransformation } from 'sparql-view-unfold';

/**
 * @fileoverview The one thing this demo knows that `sparql-view-unfold` does not: its sources hold RDF 1.1.
 *
 * The package rewrites a query over *views*, and says nothing about what the data those views are defined
 * on may contain - a view body could perfectly well read a source that already speaks RDF 1.2. The demo's
 * whole point is the case where it cannot: the mappings describe how RDF 1.1 represents RDF 1.2, and the
 * rewritten query goes to an endpoint that would not even parse a `<<( … )>>`.
 *
 * The vendored rewriting this demo used to carry hard-coded that assumption into the range lattice: the
 * object position of a *pattern* took `sourceObjectRange`, `objectRange` without `Quad`, so a branch that
 * needed a triple term to come out of the data was proven empty and collapsed to `FILTER(FALSE)`. Those
 * ranges are internal to the package, so the assumption is stated here where the package can hear it -
 * as part of the mapping, which is where it belongs anyway:
 *
 * 1. {@link withRdf11SourceAssumption} filters every data-matching pattern of the mapping body by
 *    `!isTRIPLE(?x)` for each variable that could otherwise bind a triple term, and states the same again
 *    just inside every projection of the body. The unfolding emits `isTRIPLE(?x)` as its own guard where a
 *    pattern needs a triple term out of the data, and the two together are a contradiction the package
 *    folds away - leaving the `FILTER(FALSE)` the narrowed range used to produce, at the same point of the
 *    pipeline.
 * 2. {@link dropRdf11SourceAssumptionTransformation} takes the assumption back out of whatever survived
 *    the pushdown. What it removes is a tautology for an RDF 1.1 source, so removing it changes no answer -
 *    and leaving it in would send the endpoint a `FILTER(!isTRIPLE(?x))` for every triple pattern of every
 *    mapping body, which is noise in a demo whose output is meant to be read.
 *
 * **Why it has to be said more than once.** The package treats a *positive* `isTRIPLE(?x)` as an assertion
 * on a term type, which its pushdown carries down the plan, but a negated one is a residual that stays
 * where it is written. So the contradiction is only found where the guard and our conjunct sit in one
 * region the pushdown may move things across, and a `SERVICE`, a `LIMIT` or a `GROUP` is a barrier it may
 * not cross. Saying it once at the leaf was enough for a mapping body that is a plain BGP and silently
 * wrong for one that federates - which is how this demo's own example mappings are written.
 *
 * The alternative - walking the finished query and replacing every pattern that still writes a triple term
 * by `FILTER(FALSE)` - covers less: a branch can need a triple term out of the data without ever writing
 * one, as `?t rdf:reifies ?o . FILTER(isTRIPLE(?o))` does, and deciding *that* means redoing the range
 * analysis the package already has. Better to hand the package the fact and let it draw its own
 * conclusions.
 *
 * **What this cannot reach, and the vendored range lattice could not either**: a mapping head fed by an
 * aggregate. `CONSTRUCT { ?s ?p ?o } WHERE { SELECT ?s ?p (MAX(?z) AS ?o) … }` puts the guard on
 * `isTRIPLE(MAX(?z))`, and no assumption about `?z` contradicts that - the vendored `certainlyBoundVars`
 * gave an aggregate's target `objectRange`, "a type this does not track", for the same reason.
 *
 * **What this cannot tell apart**: our `!isTRIPLE(?x)` from one a *mapping author* writes, since the
 * pushdown rewrites both. Stripping theirs is harmless under the RDF 1.1 premise, but it would flatten a
 * deliberately empty branch such as `BIND(<<( ?a ?b ?c )>> AS ?x) FILTER(!isTRIPLE(?x))`.
 *
 * The proper home for all of this is the package: a `MappingOptions` flag restoring `sourceObjectRange`
 * would replace this file with one argument, and the barrier problem with it - a range is a property of a
 * variable, computed bottom-up over the whole tree, so no barrier can hide it.
 */

/** The factories the assumption is written with; they are built once, holding no state of a rewrite. */
const AF = new AlgebraFactory();
const DF = new DataFactory();

/** The literal `false`, the condition of the `FILTER(FALSE)` the package reads as the empty multiset. */
const termFalse = DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean'));

/** The literal `true`, what the weak form folds to once its variable is substituted by a term. */
const termTrue = DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean'));

/**
 * Whether a variable is the user query's rather than the mapping's.
 *
 * The rewriting renames every user variable under {@link VAR_PREFIX_USER_QUERY} and everything the mapping
 * introduces under a prefix of its own, so this is what tells an assumption we wrote about a mapping's data
 * patterns apart from an `isTRIPLE` test the user asked for.
 * @param name - The variable name to classify
 * @returns whether it came from the user query
 */
function isUserQueryVariable(name: string): boolean {
  return name.startsWith(VAR_PREFIX_USER_QUERY);
}

/**
 * `!isTRIPLE(?x)`, the assumption in one variable.
 * @param variable - The variable that cannot bind a triple term
 * @returns the expression
 */
function notATripleTerm(variable: RDF.Variable): Algebra.Expression {
  return AF.createOperatorExpression('!', [
    AF.createOperatorExpression('istriple', [ AF.createTermExpression(variable) ]),
  ]);
}

/**
 * The conjunction of the given expressions, which there is at least one of.
 * @param expressions - The conjuncts
 * @returns their conjunction
 */
function conjunction(expressions: Algebra.Expression[]): Algebra.Expression {
  return expressions.reduce((left, right) => AF.createOperatorExpression('&&', [ left, right ]));
}

/**
 * `!bound(?x) || !isTRIPLE(?x)`, the assumption in one variable that may not be bound.
 *
 * `!isTRIPLE` raises on an unbound argument, which a `FILTER` answers by rejecting the solution - so the
 * bare form is only safe where the variable is certainly bound, which above a leaf it is not: an `OPTIONAL`
 * that did not match leaves its variables unbound, and stating the assumption over them would silently turn
 * the `OPTIONAL` into a join. This is the weak form the package uses for the same reason.
 * @param variable - The variable that, when bound, cannot hold a triple term
 * @returns the expression
 */
function notATripleTermIfBound(variable: RDF.Variable): Algebra.Expression {
  return AF.createOperatorExpression('||', [
    AF.createOperatorExpression('!', [
      AF.createOperatorExpression('bound', [ AF.createTermExpression(variable) ]),
    ]),
    notATripleTerm(variable),
  ]);
}

/**
 * The variables of a triple pattern that an RDF 1.1 source could never bind to a triple term.
 *
 * Only the object position needs saying: the subject and predicate of a triple admit no triple term in RDF
 * 1.2 either, so the package's own `subjectRange` and `predicateRange` already exclude it there.
 * @param pattern - The pattern to read
 * @returns its object variable, where it has one
 */
function objectVariableOf(pattern: Algebra.Pattern): RDF.Variable[] {
  return pattern.object.termType === 'Variable' ? [ pattern.object ] : [];
}

/**
 * Whether a pattern or a path asks the source for a triple term outright, which no RDF 1.1 source holds.
 *
 * A mapping body is not supposed to write one - it matches the data, which is RDF 1.1 - but nothing stops
 * an author from doing it, and a pattern that does matches nothing at all. Both ends are read: the object
 * is where RDF 1.2 puts a triple term, and a subject written as one is a pattern that matches nothing
 * either way.
 * @param ends - The terms the pattern or path matches on
 * @returns whether a triple term is written in any of them
 */
function writesTripleTerm(...ends: RDF.Term[]): boolean {
  return ends.some(term => term.termType === 'Quad');
}

/**
 * The variables of a subtree that are bound by reading the source, and so hold whatever the source holds.
 *
 * A variable is counted when it appears in a position a pattern or a path matches on, and discounted as
 * soon as anything in the subtree *constructs* it - a `BIND` or a `VALUES` - since a constructed variable
 * can hold whatever the expression builds, a triple term included. That exclusion is what keeps the
 * assumption off the head variables of a merged mapping: `?m_o` is a `BIND` of the head each branch writes,
 * which for a triple term mapping is a `<<( … )>>`.
 * @param op - The subtree to read
 * @returns the names of its source-bound variables, and the variables themselves
 */
function sourceBoundVariables(op: Algebra.Operation): RDF.Variable[] {
  const fromSource = new Map<string, RDF.Variable>();
  const constructed = new Set<string>();
  const remember = (term: RDF.Term): void => {
    if (term.termType === 'Variable') {
      fromSource.set(term.value, term);
    }
  };
  algebraUtils.visitOperation(op, {
    [Algebra.Types.PATTERN]: { visitor: (pattern: Algebra.Pattern) => remember(pattern.object) },
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
  return [ ...fromSource.entries() ]
    .filter(([ name ]) => !constructed.has(name))
    .map(([ , variable ]) => variable);
}

/**
 * Restricts every pattern of a mapping body to what an RDF 1.1 source can answer with.
 *
 * Each BGP and each property path is filtered by the assumption its own variables have to satisfy, and
 * **the assumption is stated again just inside every projection of the body**. The repetition is what makes
 * this work at all: the package reads a *positive* `isTRIPLE(?x)` as an assertion on a term type, which its
 * pushdown carries through the plan, but a negated one is a residual that stays where it is written. The
 * contradiction is therefore only found where the unfolding's `isTRIPLE` guard and our `!isTRIPLE` meet
 * inside one region the pushdown may move things across - and a `SERVICE`, a `LIMIT` or a `GROUP` is a
 * barrier it may not cross. A mapping body reading a `SERVICE`, which is how this demo federates, would
 * otherwise keep the branch and send `SUBJECT(?x)` to an endpoint that speaks SPARQL 1.1.
 *
 * A projection is the one place worth restating it: it bounds a scope, so what is written just inside one
 * stands above every barrier of that scope while still naming variables that scope has.
 * @param mapping - The mapping as {@link mappingFromConstructQueries} built it
 * @returns the mapping, its body restricted to RDF 1.1
 */
export function withRdf11SourceAssumption(mapping: Mapping): Mapping {
  const body = algebraUtils.mapOperation<'unsafe', Algebra.Project>(mapping.body, {
    [Algebra.Types.BGP]: { transform: (bgp) => {
      // A pattern reading a triple term out of RDF 1.1 matches nothing, and empties the whole BGP with it.
      if (bgp.patterns.some(pattern => writesTripleTerm(pattern.subject, pattern.object))) {
        return AF.createFilter(AF.createBgp([]), AF.createTermExpression(termFalse));
      }
      const variables = [ ...new Map(bgp.patterns.flatMap(objectVariableOf)
        .map(variable => [ variable.value, variable ])).values() ];
      return variables.length === 0 ? bgp : AF.createFilter(bgp, conjunction(variables.map(notATripleTerm)));
    } },
    [Algebra.Types.PATH]: { transform: (path) => {
      if (writesTripleTerm(path.subject, path.object)) {
        return AF.createFilter(AF.createBgp([]), AF.createTermExpression(termFalse));
      }
      // A path says nothing about which type its endpoints have - `?lit ^:p ?s` legitimately starts at a
      // literal, and a zero-length path returns whatever the other end held - so both of them are only
      // known to be terms the source holds, and the source holds RDF 1.1.
      const variables = [ path.subject, path.object ]
        .filter((term): term is RDF.Variable => term.termType === 'Variable');
      return variables.length === 0 ? path : AF.createFilter(path, conjunction(variables.map(notATripleTerm)));
    } },
    [Algebra.Types.PROJECT]: { transform: (project) => {
      const variables = sourceBoundVariables(project.input);
      return variables.length === 0 ?
        project :
        AF.createProject(
          AF.createFilter(project.input, conjunction(variables.map(notATripleTermIfBound))),
          project.variables,
        );
    } },
  });
  return { head: mapping.head, body };
}

/**
 * The conjuncts of an expression, a conjunction being written as a left-nested chain of `&&`.
 * @param expression - The expression to split
 * @returns its conjuncts, in the order they are written
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

/**
 * Whether an expression is one of the `!isTRIPLE(?x)` conjuncts {@link withRdf11SourceAssumption} wrote.
 *
 * The variable decides: the assumption is only ever stated about a mapping's own variables, so a test the
 * user query wrote about one of its own is left alone. The pushdown can rewrite a clique of unified
 * variables to its lexicographically first member, and a mapping prefix always sorts before
 * {@link VAR_PREFIX_USER_QUERY}, so an assumption of ours never arrives here wearing a user variable's
 * name.
 * @param expression - The conjunct to classify
 * @returns whether it is the RDF 1.1 source assumption about a mapping variable
 */
function isRdf11SourceAssumption(expression: Algebra.Expression): boolean {
  if (expression.subType !== Algebra.ExpressionTypes.OPERATOR) {
    return false;
  }
  // The weak form, `!bound(?x) || !isTRIPLE(?x)`: ours exactly when its right half is.
  if (expression.operator === '||' && expression.args.length === 2) {
    const [ unbound, notTriple ] = expression.args;
    return unbound.subType === Algebra.ExpressionTypes.OPERATOR && unbound.operator === '!' &&
      unbound.args[0].subType === Algebra.ExpressionTypes.OPERATOR && unbound.args[0].operator === 'bound' &&
      isRdf11SourceAssumption(notTriple);
  }
  if (expression.operator !== '!') {
    return false;
  }
  const [ negated ] = expression.args;
  if (negated.subType !== Algebra.ExpressionTypes.OPERATOR || negated.operator !== 'istriple') {
    return false;
  }
  const [ argument ] = negated.args;
  return argument.subType === Algebra.ExpressionTypes.TERM &&
    argument.term.termType === 'Variable' &&
    !isUserQueryVariable(argument.term.value);
}

/**
 * Whether an expression is the constant `true`.
 * @param expression - The conjunct to classify
 * @returns whether it is that literal
 */
function isTrue(expression: Algebra.Expression): boolean {
  return expression.subType === Algebra.ExpressionTypes.TERM && expression.term.equals(termTrue);
}

/**
 * Removes the assumption {@link withRdf11SourceAssumption} put in, wherever it survived the pushdown.
 *
 * Its place in the pipeline is after the last pass that reads assertions and before `removeProjections`,
 * which renames every variable a projection hid and so takes away the prefix this reads.
 * @returns the transformation
 */
export function dropRdf11SourceAssumptionTransformation(): QueryTransformation {
  return (_context, operation) => algebraUtils.mapOperation<'unsafe', Algebra.Operation>(operation, {
    [Algebra.Types.FILTER]: { transform: (filter) => {
      const conjuncts = conjunctsOf(filter.expression);
      // A `true` conjunct is what the weak form folds to where the pushdown substituted a term for its
      // variable: `!bound(<urn:o>) || !isTRIPLE(<urn:o>)`. Dropping one constrains nothing either way.
      const kept = conjuncts.filter(conjunct => !isRdf11SourceAssumption(conjunct) && !isTrue(conjunct));
      if (kept.length === conjuncts.length) {
        return filter;
      }
      return kept.length === 0 ? filter.input : AF.createFilter(filter.input, conjunction(kept));
    } },
  });
}
