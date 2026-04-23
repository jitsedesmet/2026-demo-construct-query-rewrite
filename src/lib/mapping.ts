export interface Mapping {
  id: string;
  label: string;
  query: string;
}

export const DEFAULT_MAPPING_QUERY = 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }';
export const DEFAULT_MAPPING_LABEL = 'Identity';
