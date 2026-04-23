interface MappingDescription {
  label: string;
  query: string;
}

interface QueryDescription {
  name: string;
  query: string;
  mappings: MappingDescription[];
}

const identityMapping: MappingDescription = {
  label: 'Identity',
  query: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }',
};

export const exampleQueries: QueryDescription[] = [
  {
    name: "Brad Pitt movies (default)",
    query: `PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?movie ?title ?name
WHERE {
  ?movie dbpedia-owl:starring [ rdfs:label "Brad Pitt"@en ];
         rdfs:label ?title;
         dbpedia-owl:director [ rdfs:label ?name ].
  FILTER LANGMATCHES(LANG(?title), "EN")
  FILTER LANGMATCHES(LANG(?name),  "EN")
}`,
    mappings: [identityMapping],
  },
  {
    name: "Movie cast — virtual vocabulary",
    query: `PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?movie ?title ?actor ?actorName
WHERE {
  ?movie dbpedia-owl:starring [ rdfs:label "Brad Pitt"@en ] ;
         rdfs:label ?title ;
         dbpedia-owl:starring ?actor .
  ?actor rdfs:label ?actorName .
  FILTER LANGMATCHES(LANG(?title), "EN")
  FILTER LANGMATCHES(LANG(?actorName), "EN")
} LIMIT 20`,
    mappings: [
      {
        label: 'Film → ex:Movie',
        query: `PREFIX ex: <http://example.org/>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

CONSTRUCT { ?film a ex:Movie ; ex:title ?title }
WHERE {
  ?film a dbpedia-owl:Film ;
        rdfs:label ?title .
  FILTER LANGMATCHES(LANG(?title), "en")
}`,
      },
      {
        label: 'Actor → ex:Person',
        query: `PREFIX ex: <http://example.org/>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

CONSTRUCT { ?person a ex:Person ; ex:name ?name }
WHERE {
  ?person a dbpedia-owl:Actor ;
          rdfs:label ?name .
  FILTER LANGMATCHES(LANG(?name), "en")
}`,
      },
      {
        label: 'Starring → ex:features',
        query: `PREFIX ex: <http://example.org/>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>

CONSTRUCT { ?film ex:features ?actor }
WHERE { ?film dbpedia-owl:starring ?actor }`,
      },
    ],
  },
  {
    name: "Director filmography — virtual vocabulary",
    query: `PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?film ?title ?director ?directorName
WHERE {
  ?film dbpedia-owl:director ?director ;
        rdfs:label ?title .
  ?director rdfs:label ?directorName .
  FILTER LANGMATCHES(LANG(?title), "EN")
  FILTER LANGMATCHES(LANG(?directorName), "EN")
} LIMIT 20`,
    mappings: [
      {
        label: 'ex:directedBy',
        query: `PREFIX ex: <http://example.org/>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

CONSTRUCT { ?film ex:directedBy ?director ; ex:title ?title }
WHERE {
  ?film dbpedia-owl:director ?director ;
        rdfs:label ?title .
  FILTER LANGMATCHES(LANG(?title), "en")
}`,
      },
      {
        label: 'Director → ex:Director',
        query: `PREFIX ex: <http://example.org/>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

CONSTRUCT { ?person a ex:Director ; ex:name ?name }
WHERE {
  ?person a dbpedia-owl:Person ;
          rdfs:label ?name .
  FILTER LANGMATCHES(LANG(?name), "en")
}`,
      },
    ],
  },
  {
    name: "Co-starring actors — virtual vocabulary",
    query: `PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?name1 ?name2
WHERE {
  ?film dbpedia-owl:starring ?actor1 , ?actor2 .
  FILTER (?actor1 != ?actor2)
  ?actor1 rdfs:label ?name1 .
  ?actor2 rdfs:label ?name2 .
  ?film dbpedia-owl:starring [ rdfs:label "Brad Pitt"@en ] .
  FILTER LANGMATCHES(LANG(?name1), "EN")
  FILTER LANGMATCHES(LANG(?name2), "EN")
} LIMIT 20`,
    mappings: [
      {
        label: 'ex:coStarredWith',
        query: `PREFIX ex: <http://example.org/>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>

CONSTRUCT { ?actor1 ex:coStarredWith ?actor2 }
WHERE {
  ?film dbpedia-owl:starring ?actor1 , ?actor2 .
  FILTER (?actor1 != ?actor2)
}`,
      },
      {
        label: 'Actor name → ex:name',
        query: `PREFIX ex: <http://example.org/>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

CONSTRUCT { ?actor ex:name ?name }
WHERE {
  ?actor a dbpedia-owl:Actor ;
         rdfs:label ?name .
  FILTER LANGMATCHES(LANG(?name), "en")
}`,
      },
    ],
  },
  {
    name: "Actor birth dates — temporal mapping",
    query: `PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?name ?birthDate
WHERE {
  ?person a dbpedia-owl:Actor ;
          rdfs:label ?name ;
          dbpedia-owl:birthDate ?birthDate .
  FILTER LANGMATCHES(LANG(?name), "EN")
} LIMIT 20`,
    mappings: [
      {
        label: 'Birth date → ex:born',
        query: `PREFIX ex: <http://example.org/>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>

CONSTRUCT { ?person ex:born ?date }
WHERE { ?person dbpedia-owl:birthDate ?date }`,
      },
      {
        label: 'Actor → ex:Person',
        query: `PREFIX ex: <http://example.org/>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

CONSTRUCT { ?person a ex:Person ; ex:name ?name }
WHERE {
  ?person a dbpedia-owl:Actor ;
          rdfs:label ?name .
  FILTER LANGMATCHES(LANG(?name), "en")
}`,
      },
    ],
  },
];
