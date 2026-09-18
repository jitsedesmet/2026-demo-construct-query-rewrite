FROM node:lts AS builder
LABEL authors="jitsedesmet"

WORKDIR /var/www/demo
# The rewriting lives in `sparql-view-unfold`, linked in as a yarn workspace from a local checkout. Its
# manifest comes in with the root one so that the install below can link it. Once the package is on npm,
# dropping the `workspaces` entry from package.json and this COPY builds against the published one instead.
COPY package.json yarn.lock ./
COPY sparql-view-unfold/package.json ./sparql-view-unfold/

RUN corepack enable
RUN yarn install --ignore-scripts

COPY . .
RUN yarn install && yarn build:lib && yarn setup && yarn build


FROM nginx:latest AS runner

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /var/www/demo/build/ /usr/share/nginx/html
