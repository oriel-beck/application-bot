FROM node:16.15 as builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build

FROM node:16.15 as runner
WORKDIR /app
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/dist dist
COPY *json ./
CMD ["npm", "run", "start:prod"]