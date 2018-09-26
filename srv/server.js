/*eslint no-console: 0, no-unused-vars: 0, no-undef:0, no-process-exit:0*/
/*eslint-env node, es6 */

"use strict";

const app = require("./lib/app");
// CF will set the environmental variable PORT
const port = process.env.PORT || 3000;

// Start the listener of the express app
app.listen(port);