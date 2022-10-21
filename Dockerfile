FROM node:18-bullseye
WORKDIR /app

COPY package.json /app
RUN npm i --quiet --omit=dev