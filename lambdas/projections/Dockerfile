FROM public.ecr.aws/lambda/nodejs:18
COPY src index.js package.json ./
RUN npm install
RUN npm run build
CMD [ "index.handler" ]