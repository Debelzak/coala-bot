FROM node:21.7.3-alpine
WORKDIR /usr/app
COPY .git /usr/app/.git
COPY src /usr/app/src
COPY package.json /usr/app/package.json
COPY tsconfig.json /usr/app/tsconfig.json
RUN npm install
CMD [ "npm", "start" ]