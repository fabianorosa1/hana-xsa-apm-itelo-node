
/*eslint no-console: 0, no-unused-vars: 0, no-undef:0, no-process-exit:0*/
/*eslint-env node, es6 */

"use strict";

const cds = require("@sap/cds");
const app = require("express")();
const xsenv = require("@sap/xsenv");
const odataURL = "/odata/v4/clouds.products.CatalogService/";

// health endpoint
app.get("/node/health", (req, res) => {
  res.send("ok");
});

app.get("/getSessionInfo", (req, res) => {
	let body = JSON.stringify({
		"session" : [{"UserName": "DUMMY", "Language": req.headers["accept-language"]}]
	});
	return res.type("application/json").status(200).send(body);
});

var hanaOptions = xsenv.getServices({
	hana: {
		tag: "hana"
	}
});
var options = {driver: "hana"};
Object.assign(options, hanaOptions.hana, {driver: options.driver});

cds.connect(options); 

// Main app
cds.serve("gen/csn.json", {crashOnError: false})
  .at(odataURL)
  .with(require("./handlers"))
  .in(app)
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });

// Redirect any to service root
app.get("/", (req, res) => {
  res.redirect(odataURL);
});

// Redirect any to service root
app.get("/node", (req, res) => {
  res.redirect(odataURL);
});

module.exports = app;