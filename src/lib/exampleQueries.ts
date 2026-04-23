interface QueryDescription {
  name: string;
  query: string;
}

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
  },
  {
    name: "ADJUST – timezone-adjusted date constant",
    query: `PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT *
WHERE {
  ?movie dbpedia-owl:starring [ rdfs:label "Brad Pitt"@en ];
         rdfs:label ?title;
         dbpedia-owl:director [ rdfs:label ?name ].
  FILTER LANGMATCHES(LANG(?title), "EN")
  FILTER LANGMATCHES(LANG(?name),  "EN")
  BIND( ADJUST ("2010-06-21T00:00:00Z"^^xsd:dateTime, "-PT10H"^^xsd:dayTimeDuration) as ?adjustedDate) .
}`,
  },
  {
    name: "ADJUST – actor birth dates shifted by 5 hours",
    query: `PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?name ?birthDate ?birthDateShifted
WHERE {
  ?person a dbpedia-owl:Actor ;
          rdfs:label ?name ;
          dbpedia-owl:birthDate ?birthDate .
  FILTER LANGMATCHES(LANG(?name), "EN")
  BIND(ADJUST( xsd:dateTime(?birthDate), "-PT5H"^^xsd:dayTimeDuration) AS ?birthDateShifted)
} LIMIT 20`,
  },
  {
    name: "LATERAL – movies starring Brad Pitt with a single label",
    query: `PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT * WHERE {
  ?movie dbpedia-owl:starring [ rdfs:label "Brad Pitt"@en ];
  LATERAL { SELECT * { ?movie rdfs:label ?title; } LIMIT 1 } .
  LATERAL { SELECT * { ?movie dbpedia-owl:director [ rdfs:label ?name ]  } LIMIT 1 } .
}`,
  },
  {
    name: "LATERAL – movies staring Brad Pitt with single optional label",
    query: `PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT * WHERE {
  ?movie dbpedia-owl:starring [ rdfs:label "Brad Pitt"@en ];
  LATERAL { OPTIONAL { SELECT * { ?movie rdfs:label ?title; } LIMIT 1 } } .
  LATERAL { OPTIONAL { SELECT * { ?movie dbpedia-owl:director [ rdfs:label ?name ]  } LIMIT 1 } } .
}`,
  },
  {
    name: "SPARQL 1.2 – TRIPLE() term creator",
    query: `PREFIX ex: <http://example.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT *
WHERE {
  ?movie a dbpedia-owl:Film ;
         dbpedia-owl:starring [ rdfs:label "Brad Pitt"@en ];
         rdfs:label ?title;
         dbpedia-owl:director [ rdfs:label ?name ].
  FILTER LANGMATCHES(LANG(?title), "EN")
  FILTER LANGMATCHES(LANG(?name),  "EN")
  BIND( TRIPLE( ?movie, rdfs:type , ex:BradPittMovie) as ?typer) .
}`,
  },
  {
    name: "SPARQL 1.2 + LATERAL – annotated triples for co-starring actors",
    query: `PREFIX ex: <http://example.org/>
PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT * WHERE {
  ?movie a dbpedia-owl:Film ;
    rdfs:label ?title ;
         
  LATERAL {       
      ?movie  dbpedia-owl:starring ?actor1 , ?actor2 .
      FILTER ( ?actor1 != ?actor2)
  }
                          
  BIND(TRIPLE(?actor1, ex:coStarredWith, ?actor2) AS ?annotated)
} LIMIT 10`,
  },
]
