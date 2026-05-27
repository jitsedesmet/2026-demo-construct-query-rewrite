interface MappingDescription {
  label: string;
  query: string;
}

interface QueryDescription {
  name: string;
  query: string;
  mappings: MappingDescription[];
  sources?: string[];
}

const identityMapping: MappingDescription = {
  label: 'Identity',
  query: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }',
};

export const exampleQueries: QueryDescription[] = [
  {
    name: 'Trustworthiness with RDF 1.2',
    query: `VERSION "1.2"
PREFIX geo:  <http://example.org/ontology/geo/>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?territoryName
       (COUNT(?claimant) AS ?claimantsCount)
       (GROUP_CONCAT(?claimantName; separator=", ") AS ?claimants)
WHERE {
  << ?territory geo:partOf ?country >> prov:wasAttributedTo ?claimant .
  ?claimant rdfs:label ?claimantName .
  ?territory rdfs:label ?territoryName .
}
GROUP BY ?territoryName
HAVING (COUNT(?claimant) > 1)
ORDER BY DESC(?claimantsCount)`,
    mappings: [identityMapping],
    sources: [
      'https://raw.githubusercontent.com/rubensworks/rdf-12-examples/refs/heads/master/territories/data.ttl',
      'https://fragments.dbpedia.org/2016-04/en',
    ],
  },
  {
    name: 'Exhaustive source selection (Bryan + Jitse co-authored with Ruben)',
    query: `PREFIX schema: <http://schema.org/>
PREFIX bibframe: <http://id.loc.gov/ontologies/bibframe/>

SELECT * WHERE {
  ?s schema:name ?name ;
      a schema:ScholarlyArticle .
}`,
    mappings: [
      {
        label: 'Bryan identity',
        query: `CONSTRUCT { ?s ?p ?o }
WHERE {
  SERVICE <https://constraint-automaton.pp.ua/publication.ttl> {
    ?s ?p ?o .
  }
}`,
      },
      {
        label: 'Jitse identity',
        query: `CONSTRUCT { ?s ?p ?o }
WHERE {
  SERVICE <https://jitsedesmet.be/profile#me> {
    ?s ?p ?o .
  }
}`,
      },
      {
        label: 'Ruben identity',
        query: `CONSTRUCT { ?s ?p ?o }
WHERE {
  SERVICE <https://www.rubensworks.net/#me> {
    ?s ?p ?o .
  }
}`,
      },
    ],
    sources: [],
  },
  {
    name: 'Spam filter (keep trusted claimants only)',
    query: `VERSION "1.2"
PREFIX dbr:  <http://dbpedia.org/resource/>
PREFIX geo:  <http://example.org/ontology/geo/>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?territoryName ?claimantName ?claimDate
WHERE {
  << dbr:Spratly_Islands geo:partOf ?country >> prov:wasAttributedTo ?claimant ;
      geo:claimDate ?claimDate .
  ?claimant rdfs:label ?claimantName .
  dbr:Spratly_Islands rdfs:label ?territoryName .
  FILTER (?claimant != dbr:Government_of_China)
}
ORDER BY ?claimDate`,
    mappings: [identityMapping],
    sources: [
      'https://raw.githubusercontent.com/rubensworks/rdf-12-examples/refs/heads/master/territories/data.ttl',
      'https://fragments.dbpedia.org/2016-04/en',
    ],
  },
];
