FROM public.ecr.aws/lambda/nodejs:18
COPY package*.json ./
RUN npm ci --omit=optional
COPY . ./
RUN npm run build
CMD [ "index.handler" ]