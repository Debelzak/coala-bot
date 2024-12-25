FROM node:23.5.0-alpine
WORKDIR /usr/app

# Build
COPY package.json ./package.json
COPY tsconfig.json ./tsconfig.json
COPY src ./src
COPY .git ./.git
RUN mkdir database &&\
    npm install && \
    npm run build && \
    npm install --omit=dev && \
    rm -rf .git src tsconfig.json tsconfig.tsbuildinfo

# Finally
CMD [ "npm", "start" ]