import express from "express";
import runProjections from "./index";

const app = express();
const port = 3000;

app.use(express.json());

const router = express.Router();

router.get("/projections", (req, res) => {
  const projections = runProjections(req.body);
  res.json(projections);
});

app.use(router);

app.listen(port, () => console.log(`application started at ${port}`));
