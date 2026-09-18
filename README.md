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

The rewriting itself is [`sparql-view-unfold`](https://github.com/jitsedesmet/sparql-view-unfold). This
repository holds the demo around it: the mappings, the query editor, the step slider, and the one thing the
package deliberately does not assume — that the sources hold RDF 1.1 (`src/lib/mapping/rdf11Source.ts`).

The package is linked in as a yarn workspace from a checkout beside this file, which git ignores:

```bash
git clone git@github.com:jitsedesmet/sparql-view-unfold.git
yarn install
yarn build:lib   # the workspace ships compiled JS, so it has to be built before the demo can import it
yarn dev
```

`yarn build:lib` builds the workspace with this repository's TypeScript rather than through the package's
own `build` script, which hard-codes a `node_modules/typescript` a hoisted workspace install does not have.

To build against the published package instead, drop the `workspaces` entry from `package.json` and the
`COPY sparql-view-unfold/package.json` line from the `Dockerfile`; nothing else refers to the checkout.
