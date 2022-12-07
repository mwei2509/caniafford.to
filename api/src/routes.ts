import * as Router from "koa-router";

const router = new Router();

router.get('/healthcheck', async (ctx) => {
    ctx.body = "ok";
});

export default router;