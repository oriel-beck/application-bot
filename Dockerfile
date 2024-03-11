FROM node:18 AS builder
WORKDIR /app
COPY *.json ./
COPY yarn.lock .
COPY .swcrc .
COPY src src
RUN curl --compressed -o- -L https://yarnpkg.com/install.sh | bash
RUN yarn
RUN yarn swc src --config-file .swcrc -d dist

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/dist/src src
COPY json json
COPY *json ./
COPY scylla scylla
CMD node src/index.js