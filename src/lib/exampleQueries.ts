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
  query: 'CONSTRUCT WHERE { ?s ?p ?o }',
};

function identityOfSource(source: string) {
  return `CONSTRUCT { ?s ?p ?o }
WHERE { SERVICE <${source}> {
  ?s ?p ?o .
} }`
}

const papersExample: QueryDescription = {
  name: 'Exhaustive Source Selection (articles of Bryan, Jitse and Ruben)',
  query: `PREFIX schema: <http://schema.org/>
PREFIX bibframe: <http://id.loc.gov/ontologies/bibframe/>
SELECT * WHERE {
  ?s schema:name ?name ;
       a schema:ScholarlyArticle .
}`,
  mappings: [
    {
      label: 'Bryan',
      query: `CONSTRUCT { ?s ?p ?o }
WHERE { SERVICE SILENT <https://constraint-automaton.pp.ua/publication.ttl> {
  ?s ?p ?o .
} }`
    }, {
      label: 'Jitse',
      query: identityOfSource('https://jitsedesmet.be/profile#me')
    }, {
      label: 'Ruben T',
      query: identityOfSource('https://www.rubensworks.net/#me')
    }
  ],
  sources: [],
};

const wikidataExample: QueryDescription = {
  name: 'Wikidata Reification',
  query: `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX pq: <http://www.wikidata.org/prop/qualifier/>
SELECT * WHERE {
  << wd:Q31 wdt:P31 ?country >> # pq:P582 ?end
}`,
  mappings: [
    {
      label: 'Triple Term',
      query: `PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

CONSTRUCT {
  ?t rdf:reifies <<( ?s ?wdt ?o )>>
} WHERE {
  ?s ?p ?t .
  ?t ?ps ?o .
  
  ?wd wikibase:directClaim ?wdt ;
          wikibase:claim ?p ;
          wikibase:statementProperty ?ps . 
}`,
    },
    identityMapping,
  ],
  sources: ['https://query.wikidata.org/sparql'],
}


const uniprotExample: QueryDescription = {
  name: 'uniprot Reification',
  query: `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX up:  <http://purl.uniprot.org/core/>
PREFIX uniprotkb: <http://purl.uniprot.org/uniprot/>
SELECT * WHERE {
  << uniprotkb:P01308 up:annotation ?annotation >> # up:attribution ?attribution .
  # ?attribution up:evidence ?evidence ;   # ECO code (e.g. ECO_0000269 = experimental)
  #              up:source   ?source .     # citation / PubMed entry
}
LIMIT 1`,
  mappings: [
    {
      label: 'Triple Term',
      query: `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
CONSTRUCT {
  ?t rdf:reifies <<( ?s ?p ?o)>> 
} WHERE {
  ?t a rdf:Statement; rdf:subject ?s ;
  rdf:predicate ?p ; rdf:object ?o .
}`
    },
    identityMapping
  ],
  sources: [
    'https://sparql.uniprot.org/sparql'
  ],
}

const filterExample: QueryDescription = {
  name: 'Paper Filter Verborgh',
  query: `PREFIX schema: <http://schema.org/>

SELECT * WHERE {
  ?s schema:name ?o ;
     a schema:ScholarlyArticle .
}`,
  mappings: [
    {
      label: 'Canonical Mapping: (Jitse + RT) \ RV',
      query: `PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
CONSTRUCT {
  ?article ?p ?o .
} WHERE {
  { {
    SERVICE <https://jitsedesmet.be/profile/#me> {
      ?article a schema:ScholarlyArticle;
               schema:name ?nameL ;
               ?p ?o .
      BIND(STR(?nameL) AS ?name).
    }
  } UNION {
    SERVICE <https://www.rubensworks.net/publications/>  {
      ?article a schema:ScholarlyArticle ;
               schema:name ?nameL ;
               ?p ?o .
      BIND(STR(?nameL) AS ?name).
    }
  }} MINUS {
    SERVICE <https://ruben.verborgh.org/profile/#me> {
      ?srv a schema:ScholarlyArticle ;
           rdfs:label ?nameLL ;
           ?p ?o .
      BIND(STR(?nameLL) AS ?name).
    }
  } 
}`
    },
  ],
  sources: [],
}

export const exampleQueries: QueryDescription[] = [
  wikidataExample,
  papersExample,
  uniprotExample,
  filterExample
];
