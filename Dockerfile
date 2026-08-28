FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG APP_NAME
ENV APP_NAME=${APP_NAME}

RUN npx nest build ${APP_NAME}

CMD node dist/apps/${APP_NAME}/main.js
