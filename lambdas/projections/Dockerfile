FROM public.ecr.aws/lambda/nodejs:18
COPY package*.json /app/
WORKDIR /app
RUN npm ci --omit=optional
COPY . /app
RUN npm run build
CMD [ "index.handler" ]