FROM node:18.12-bullseye-slim

# install
COPY ./api/package*.json /app/
WORKDIR /app
RUN npm ci --omit=optional
COPY ./api /app

# build
RUN npm run build

CMD ["npm", "start"]
