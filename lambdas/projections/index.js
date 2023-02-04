const runProjections = require("./dist/index.js").default;

exports.handler = async (event) => {
  console.log(runProjections);
  return runProjections(event);
};
