import {operationTransform, queryTransform} from "./transformBgp";
import {type TransformContext, transformContextFromConstructs} from "./transformContext";
import type {Algebra} from '@traqula/algebra-transformations-1-2';
import {substituteVarsThatArePreBoundToTerms} from "$lib/mapping/transformations/boundedVarSubstitution";

export function transformQueryUsingConstructs(
  userQuery: string,
  mappers: string[],
  transformations: ((c: TransformContext, op: Algebra.Operation) => Algebra.Operation)[] = [ operationTransform, substituteVarsThatArePreBoundToTerms ],
): string {
  const transformerContext = transformContextFromConstructs(mappers);
  return queryTransform(transformerContext, userQuery, transformations).trim();
}
