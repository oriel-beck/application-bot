FROM node:16.15 as builder
WORKDIR /app
COPY . .
# --force is required due to @nestjs-modules/ioredis requiring v8 nest while we use v9
RUN npm ci --force
RUN npm run build

FROM node:16.15 as runner
WORKDIR /app
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/dist dist
COPY *json ./
CMD ["npm", "run", "start:prod"]