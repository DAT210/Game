FROM node:8

WORKDIR /usr/src/app

ARG port
ENV PORT $port

COPY package*.json ./
RUN npm install

COPY ./src ./src

ENV NODE_ENV production
COPY ./env/production.env ./env

EXPOSE $port

CMD [ "node", ".src/app.js" ]