FROM node:latest
WORKDIR /usr/app
COPY .git /usr/app/.git
COPY src /usr/app/src
COPY .env /usr/app/.env
COPY package.json /usr/app/package.json
COPY tsconfig.json /usr/app/tsconfig.json
RUN npm install
CMD [ "npm", "start" ]