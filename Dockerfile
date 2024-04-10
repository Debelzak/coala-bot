FROM node:latest
WORKDIR /usr/app
COPY package.json /usr/app/package.json
COPY tsconfig.json /usr/app/tsconfig.json
COPY .env /usr/app/.env
COPY src /usr/app/src
RUN npm install
CMD [ "npm", "start" ]