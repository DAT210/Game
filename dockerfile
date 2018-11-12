FROM node:8

WORKDIR /usr/src/app

ARG port
ENV PORT $port


COPY package.json .
RUN npm install

COPY ./src ./src

COPY ./env/production.env ./env/
ENV NODE_ENV production

EXPOSE $port

#CMD ["ls", "./env"]
CMD [ "node", "./src/app.js" ]