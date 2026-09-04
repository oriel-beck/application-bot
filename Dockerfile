FROM node:22 AS base
RUN curl --compressed -o- -L https://yarnpkg.com/install.sh | bash

FROM base AS installer
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install

FROM base AS builder
WORKDIR /app
COPY .swcrc .
COPY src src
COPY --from=installer /app .
RUN yarn swc src --config-file .swcrc -d dist

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=installer /app .
COPY --from=builder /app/dist/src src
COPY json json
COPY *json ./
COPY drizzle drizzle
CMD node src/index.js


