const runProjections = require("./dist/index.js");

exports.handler = async (event, context) => {
  const projection = await runProjections.default(event);
  return projection;
};
