/*eslint no-console: 0, no-unused-vars: 0, no-undef:0, no-process-exit:0*/
/*eslint-env node, es6 */

"use strict";

/**
 * Register handlers to events.
 * @param {Object} entities
 * @param {Object} entities.Images
 * @param {Object} entities.Products
 * @param {Object} entities.Stocks
 */
module.exports = function (entities) {
  const {Products} = entities;

  // this is the instance of the service created by cds.serve -> cds.service
  const products = require("./products")(entities);
  this.before("CREATE", Products, products.beforeCreate);
  this.after("CREATE", Products, products.afterCreate);
  this.before("UPDATE", Products, products.beforeUpdate);
  this.before("DELETE", Products, products.beforeDelete);
};