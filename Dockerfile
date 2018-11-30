FROM node:8

WORKDIR /usr/src/app

ARG port
ENV PORT $port


COPY package.json .
RUN npm install

COPY ./src ./src

COPY ./env/dev.env ./env/
ENV NODE_ENV dev

EXPOSE $port

CMD [ "node", "./src/app.js" ]
