import * as Koa from 'koa';
import * as logger from 'koa-logger';
import * as json from 'koa-json';
import router from './routes';

require('dotenv').config();

const app = new Koa();

// middleware
app.use(json());
app.use(logger());

// routes
app.use(router.routes()).use(router.allowedMethods());

app.listen(3000, () => {
    console.log('API started')
});