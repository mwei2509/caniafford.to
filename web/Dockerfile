FROM node:18.12-bullseye-slim

COPY ./web/package*.json /app/
WORKDIR /app
RUN npm ci --no-optional
COPY ./web /app
RUN npm run build

# start app
CMD ["npm", "start"]
