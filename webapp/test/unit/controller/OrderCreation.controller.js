/*global QUnit*/

sap.ui.define([
	"com/espedia/demo/OrderCreation/controller/OrderCreation.controller"
], function (Controller) {
	"use strict";

	QUnit.module("OrderCreation Controller");

	QUnit.test("I should test the OrderCreation controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});