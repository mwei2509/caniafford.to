const runProjections = require("./dist/index.js");

exports.handler = async (event) => {
  return runProjections(event);
};
