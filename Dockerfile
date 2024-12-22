FROM node:23.5.0-alpine
WORKDIR /usr/app

# Build
COPY package.json ./package.json
COPY tsconfig.json ./tsconfig.json
COPY src ./src
RUN npm install && npm run build

# Copiar arquivos de runtime
COPY .git ./.git
COPY database ./database

# Limpeza
RUN npm install --omit=dev && rm -rf src tsconfig.json

# Finally
CMD [ "npm", "start" ]