/*eslint no-console: 0, no-unused-vars: 0, no-undef:0, no-process-exit:0, new-cap:0, camelcase:0 */
/*eslint-env node, es6 */

"use strict";

const uuid = require("uuid/v4");
const cds = require("@sap/cds");

const PRODUCT_ELEMENTS_NONNEGATIVE = ["price", "height", "width", "depth", "weight"];
const PRODUCT_ELEMENTS_MANDATORY = ["ID", "name", "description", "price", "category_ID", "supplier_ID", "baseUnit_code", "currency"];
const PRODUCT_ELEMENTS_VALUEHELP = ["dimensionUnit", "weightUnit", "category", "supplier", "baseUnit"];

/**
 * Check if given values for decimal and numeric elements are positive.
 * @param {Object} context
 * @param {Object} context.data
 * @param {function} context.error
 * @return {void}
 * @private
 */
const _checkNonNegative = ({
	data,
	error
}) => {
	for (const element of PRODUCT_ELEMENTS_NONNEGATIVE) {
		// Log error instead of throwing; At the end of all before handlers the framework will throw an error
		if (Number(data[element]) < 0) {
			error(400, `Value for element ${element} is negative`);
		}
	}
};

/**
 * Check if the mandatory elements are given.
 * @param {Object} context
 * @param {Object} context.data
 * @param {function} context.error
 * @return {void}
 * @private
 */
const _checkMandatory = ({
	data,
	error
}) => {
	for (const element of PRODUCT_ELEMENTS_MANDATORY) {
		// Log error instead of throwing; At the end of all before handlers the framework will throw an error
		if (!data[element]) {
			error(400, `No value for mandatory element ${element}`);
		}
	}
};

/**
 * Try to select a product for the to be created ID.
 * @param {Object} context
 * @param {Object} context.data
 * @param {String} context.data.ID
 * @param {function} context.error
 * @param {function} context.run
 * @param {Object} context.target
 * @return {Promise}
 * @private
 */
const _checkElementDoesNotExist = ({
	data: {
		ID
	},
	error,
	run,
	target
}) => {
	return run(SELECT([1]).from(target).where("ID", ID).limit(1))
		.then((result) => {
			// Log error instead of throwing; At the end of all before handlers the framework will throw an error
			if (result.length !== 0) {
				error(400, "Product already exists");
			}
		});
};

/**
 * Instead of hard coding the keys, use cds.reflect to retrieve them on the fly.
 * Use them to fetch the value from request context and construct the where filter used to read by ID.
 * @param {Object} elements
 * @param {String} association
 * @param {Object} data
 * @return {Object}
 * @private
 */
const _getFilter = (elements, association, data) => {
	return Object.keys(cds.reflect(elements[association]).def.foreignKeys).reduce((filter, key) => {
		filter[key] = data[`${association}_${key}`];
		return filter;
	}, {});
};

/**
 * Test if entry for foreign key exists.
 * @param {Object} context
 * @param {Object} context.data
 * @param {function} context.error
 * @param {function} context.run
 * @param {Object} context.target
 * @param {Object} context.target.elements
 * @param {String} association
 * @return {Promise}
 * @private
 */
const _checkElementExists = ({
	data,
	error,
	run,
	target: {
		elements
	}
}, association) => {
	return run(SELECT(1).from(elements[association].target).where(_getFilter(elements, association, data)).limit(1))
		.then((result) => {
			// Log error instead of throwing; At the end of all before handlers the framework will throw an error
			if (result.length === 0) {
				error(400, `Value helper identifier missing for element ${association}`);
			}
		});
};

/**
 * For each given foreign key, check if the associated entity exists.
 * @param context
 * @return {Array<Promise>}
 * @private
 */
const _checkElementsExists = (context) => {
	const checks = [];

	for (const association of PRODUCT_ELEMENTS_VALUEHELP) {
		checks.push(_checkElementExists(context, association));
	}

	return checks;
};

/**
 * Validate the given product.
 * @param {Object} context
 * @return {Promise}
 * @private
 */
const _validateProduct = (context) => {
	// Static value checks
	_checkNonNegative(context);
	_checkMandatory(context);

	// In case of CREATE, add extra check if and entry with this key does not exist
	if (context.query.INSERT) {
		return Promise.all([_checkElementDoesNotExist(context), ..._checkElementsExists(context)]);
	}

	return Promise.all(_checkElementsExists(context));
};

/**
 * Calculate the foreign key for the price.
 * @param {number} value
 * @return {number}
 * @private
 */
const _determinePriceRange = (value) => {
	if (value < 100.00) {
		return 1;
	}
	if (value < 500.00) {
		return 2;
	}
	if (value < 1000.00) {
		return 3;
	}
	return 4;
};

/**
 * Provide the before update handler.
 * @return {function}
 */
const beforeCreate = (Images) => {
	/**
	 * Validate the values for associations and calculate the price range.
	 * @param {Object} context
	 * @param {Object} context.data
	 * @param {Number} context.data.price
	 */
	return (context) => {
		const {
			data,
			run
		} = context;

		return _validateProduct(context)
			.then(() => {
				// Stop in case an error already exists
				if (context._.errors && context._.errors.length) {
					return;
				}

				// Default values
				data.averageRating = data.averageRating || 0.00;
				data.numberOfReviews = data.numberOfReviews || 0.00;

				// Foreign keys for later to be created associated entities
				data.stock_ID = uuid();
				data.image_ID = uuid();

				// Calculate price range
				data.priceRange_code = _determinePriceRange(data.price);

				// Add a dummy/default for associated image entity
				return run(INSERT.into(Images).entries({
					ID: data.image_ID,
					OWNER_ID: data.ID,
					data: "image/default.jpg"
				}));
			});
	};
};

/**
 * Provide the after create handler.
 * @param {Object} Stocks
 * @return {function}
 */
const afterCreate = (Stocks) => {
	/**
	 * Add the stock entry with default values for stock_ID generated at the before create handler.
	 * @param {Array} result
	 * @param {Object} context
	 * @param {function} context.run
	 */
	return ([{
		stock_ID: stockId
	}], {
		run
	}) => {
		return run(INSERT.into(Stocks).entries({
			ID: stockId,
			availability_code: 1,
			quantity: 0,
			minimumQuantity: 0
		}));
	};
};

/**
 * Validate the values for associations and calculate the price range.
 * @param {Object} context
 * @param {Object} context.data
 * @param {Number} context.data.price
 */
const beforeUpdate = (context) => {
	const {
		data
	} = context;

	return _validateProduct(context)
		.then(() => {
			data.priceRange_code = _determinePriceRange(data.price);
		});
};

/**
 * Provide the before delete handler.
 * @param {Object} Stocks
 * @return {function}
 */
const beforeDelete = (Stocks) => {
	/**
	 * Remove the stock entry associated to the product.
	 * @param {Object} context
	 * @param {Object} context.query
	 * @param {Object} context.query.DELETE
	 * @param {Array} context.query.DELETE.where
	 * @param {function} context.run
	 * @param {Object} context.target
	 */
	return ({
		query: {
			DELETE: {
				where
			}
		},
		run,
		target
	}) => {
		return run(SELECT(["stock_ID"]).from(target).where(...where))
			.then(([{
				stock_ID: stockId
			} = {}]) => {
				if (stockId) {
					return run(DELETE.from(Stocks).where({
						ID: stockId
					}));
				}
			});
	};
};

module.exports = ({
	Images,
	Products,
	Stocks
}) => {
	return {
		beforeCreate: beforeCreate(Images),
		afterCreate: afterCreate(Stocks),
		beforeUpdate: beforeUpdate,
		beforeDelete: beforeDelete(Stocks)
	};
};