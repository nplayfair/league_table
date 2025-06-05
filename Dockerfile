FROM node:20-alpine

RUN mkdir /app

WORKDIR /app

COPY . /app

RUN chown -R node:node /app

USER node

RUN npm install

EXPOSE 3001

CMD [ "npm", "run", "start" ]