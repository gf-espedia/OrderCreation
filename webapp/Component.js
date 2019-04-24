sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"com/espedia/demo/OrderCreation/model/models",
	"jquery.sap.global"
], function (UIComponent, Device, models) {
	"use strict";
	jQuery.sap.includeStyleSheet(sap.ui.resource("com.espedia.demo.OrderCreation", "css/style.css"));
	return UIComponent.extend("com.espedia.demo.OrderCreation.Component", {

		metadata: {
			manifest: "json",
				config: {
				fullWidth: true
			}
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// enable routing
			this.getRouter().initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
		}
	});
});