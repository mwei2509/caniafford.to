const runProjection = require('./dist/index.js');

exports.handler = async (event, context) => {
    const projection = await runProjection(event);
    return projection
}