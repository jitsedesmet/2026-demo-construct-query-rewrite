# Demonstration of RDF 1.2 Interoperability through Query Rewriting

## Running demo

You can run the demo using publicly available images by running the following command in this directory:

```bash
docker compose up
```

To build the images yourself, you will need to clone this repository and run the following commands:

```bash
git clone git@github.com:jitsedesmet/2026-demo-construct-query-rewrite.git
cd 2026-demo-construct-query-rewrite
docker compose up --build
```

Now open the webapp at `http://localhost:3000/`.

## Development

The rewriting itself is the [`sparql-view-unfold`](https://www.npmjs.com/package/sparql-view-unfold)
package. What lives here is the demo around it: the mappings, the query editor, the step slider that shows
the query after every pass, and the one thing the package deliberately does not assume — that the sources
hold RDF 1.1, which `src/lib/mapping/rdf11Source.ts` states as part of the mapping and takes back out of
the rewritten query.

```bash
yarn install
yarn dev
```
