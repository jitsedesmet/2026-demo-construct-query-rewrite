import {operationTransform, queryTransform} from "./transformBgp";
import {type TransformContext, transformContextFromConstructs} from "./transformContext";
import type {Algebra} from '@traqula/algebra-transformations-1-2';

function transformQueryUsingConstructs(
  userQuery: string,
  mappers: string[],
  transformations: ((c: TransformContext, op: Algebra.Operation) => Algebra.Operation)[] = [ operationTransform ],
): string {
  const transformerContext = transformContextFromConstructs(mappers);
  return queryTransform(transformerContext, userQuery, transformations);
}
