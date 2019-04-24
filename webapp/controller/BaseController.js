sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageBox"
	//"com/espedia/demo/OrderCreation/controller/utils-old/SearchHelp"
], function (Controller, MessageBox/*, SearchHelp*/) {
	"use strict";

	//Il BaseController gestisce le funzioni di formattazione e SearchHelp

	return Controller.extend("com.espedia.demo.OrderCreation.controller.BaseController", {
		onInit: function () {
		},

		// FORMATTAZIONE
		_locale: null,
		dateFormatter: function (date) {
			var sCurrentLocale = this._locale ? this._locale : sap.ui.getCore().getConfiguration().getLanguage();
			if (!this._locale) {
				this._locale = sCurrentLocale;
			}
			var options = {
				weekday: "short",
				year: "numeric",
				month: "long",
				day: "numeric"
			};

			if (date) {
				return date.toLocaleDateString(sCurrentLocale, options);
			}
			return "";
		},

		dateFormatterShort: function (date) {
			var sCurrentLocale = this._locale ? this._locale : sap.ui.getCore().getConfiguration().getLanguage();
			if (!this._locale) {
				this._locale = sCurrentLocale;
			}
			var options = {
				year: "numeric",
				month: "2-digit",
				day: "numeric"
			};

			if (date) {
				return date.toLocaleDateString(sCurrentLocale, options);
			}
			return "";
		},

		linkEnableFormat: function (value) {
			if (value && value.length > 0) {
				return true;
			}
			return false;
		},

		linkEnableFormatInverse: function (value) {
			if (value && value.length > 0) {
				return false;
			}
			return true;
		},

		priorityFormatter: function (prior) {
			if (prior && prior.length > 0) {
				if (prior[0] === "1") {
					//return "Error";
					return sap.ui.core.ValueState.Error;
				} else if (prior[0] === "2") {
					//return "Warning";
					return sap.ui.core.ValueState.Warning;
				} else if (prior[0] === "4") {
					//return "Success";
					return sap.ui.core.ValueState.Success;
				}
			}
			//return "None";
			return sap.ui.core.ValueState.None;

		},

		// END FORMATTAZIONE

		// HELP DI RICERCA

		equiDialogSearch: function () {
			var equnr = sap.ui.getCore().byId("eqSearchNum").getValue();
			var descr = sap.ui.getCore().byId("eqSearchDescr").getValue();
			var plant = sap.ui.getCore().byId("eqSearchPlant").getValue();
			var funcloc = sap.ui.getCore().byId("eqSearchFuncloc").getValue();
			//var langu = sap.ui.getCore().byId("eqSearchLangu").getValue();
			var aFilters = [
				new sap.ui.model.Filter("Equnr", sap.ui.model.FilterOperator.Contains, equnr),
				new sap.ui.model.Filter("Eqktx", sap.ui.model.FilterOperator.Contains, descr),
				new sap.ui.model.Filter("Swerk", sap.ui.model.FilterOperator.Contains, plant),
				new sap.ui.model.Filter("Tplnr", sap.ui.model.FilterOperator.Contains, funcloc)
			];
			sap.ui.getCore().byId("equiDialogList").getBinding("items").filter(aFilters);
		},

		equiDialogSelect: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext().getPath();
			var rowData = this.getView().getModel().getProperty(sPath);
			this._orderModel.setProperty("/Order/Equipment", rowData.Equnr);
			this.eqSearchDialogClose();
		},

		equiClearForm: function () {
			sap.ui.getCore().byId("eqSearchNum").setValue("");
			sap.ui.getCore().byId("eqSearchDescr").setValue("");
			sap.ui.getCore().byId("eqSearchPlant").setValue("");
			//var plant = this._orderModel.getProperty("/Order/Werks");
			//sap.ui.getCore().byId("eqSearchPlant").setValue(plant);
			sap.ui.getCore().byId("eqSearchFuncloc").setValue("");
		},

		eqSearchDialogClose: function () {
			this._equiSearchDialog.close();
			this.equiClearForm();
		},

		handleEquipmentF4: function (oEvent) {
			//	var sInputValue = oEvent.getSource().getValue();
			if (!this._equiSearchDialog) {
				this._equiSearchDialog = sap.ui.xmlfragment(
					"com.espedia.demo.OrderCreation.view.fragments.EquipmentSearchDialog",
					this
				);
				this.getView().addDependent(this._equiSearchDialog);
			}
			this.equiClearForm();
			this.equiDialogSearch();
			this._equiSearchDialog.open();
		},
		////////////////////////////// MATERIAL  (collegato con i Components)
		matnrDialogSearch: function () {
			var matnr = sap.ui.getCore().byId("matnrSearchNum").getValue();
			var descr = sap.ui.getCore().byId("matnrSearchDescr").getValue();
			var plant = sap.ui.getCore().byId("matnrSearchPlant").getValue();
			//var langu = sap.ui.getCore().byId("eqSearchLangu").getValue();
			var aFilters = [
				new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.Contains, matnr),
				new sap.ui.model.Filter("Maktx", sap.ui.model.FilterOperator.Contains, descr),
				new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.Contains, plant)
			];
			sap.ui.getCore().byId("matnrDialogList").getBinding("items").filter(aFilters);
		},

		matnrDialogSelect: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext().getPath();
			var rowData = this.getView().getModel().getProperty(sPath);
			if (rowData) {
				this.selModel.setProperty(this.selRow + "/Material", rowData.Matnr);
				this.selModel.setProperty(this.selRow + "/MatlDesc", rowData.Maktx);
				this.selModel.setProperty(this.selRow + "/RequirementQuantityUnit", "PC");
				this.selModel.refresh();
			}
			//this._orderModel.setProperty("/Order/Equipment", equi);
			this.matnrSearchDialogClose();
		},

		matnrClearForm: function () {
			sap.ui.getCore().byId("matnrSearchNum").setValue("");
			sap.ui.getCore().byId("matnrSearchDescr").setValue("");
			//sap.ui.getCore().byId("matnrSearchPlant").setValue(""); //default plant
			var plant = this._orderModel.getProperty("/Order/Werks");
			sap.ui.getCore().byId("matnrSearchPlant").setValue(plant);
		},

		matnrSearchDialogClose: function () {
			this._matnrSearchDialog.close();
			this.matnrClearForm();
		},

		handleMaterialF4: function (oEvent) {
			this.selRow = oEvent.getSource().getBindingContext().getPath();
			this.selModel = oEvent.getSource().getModel();
			//	var sInputValue = oEvent.getSource().getValue();
			if (!this._matnrSearchDialog) {
				this._matnrSearchDialog = sap.ui.xmlfragment(
					"com.espedia.demo.OrderCreation.view.fragments.MaterialSearchDialog",
					this
				);
				this.getView().addDependent(this._matnrSearchDialog);
			}
			this.matnrClearForm();
			this.matnrDialogSearch();
			this._matnrSearchDialog.open();
		},

		//

		wcDialogSearch: function () {
			var wc = sap.ui.getCore().byId("wcSearchWorkCenter").getValue();
			var descr = sap.ui.getCore().byId("wcSearchDesciption").getValue();
			var plant = sap.ui.getCore().byId("wcSearchPlant").getValue();
			//var langu = sap.ui.getCore().byId("eqSearchLangu").getValue();
			var aFilters = [
				new sap.ui.model.Filter("Arbpl", sap.ui.model.FilterOperator.Contains, wc),
				new sap.ui.model.Filter("Ktext", sap.ui.model.FilterOperator.Contains, descr),
				new sap.ui.model.Filter("Werks", sap.ui.model.FilterOperator.Contains, plant),
				new sap.ui.model.Filter("Spras", sap.ui.model.FilterOperator.Contains, "EN")
			];
			sap.ui.getCore().byId("wcDialogList").getBinding("items").filter(aFilters);
		},

		wcDialogSelect: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext().getPath();
			var rowData = this.getView().getModel().getProperty(sPath);
			this._orderModel.setProperty("/Order/WorkCenter", rowData.Arbpl);
			this._orderModel.setProperty("/Order/WorkCenterDescr", rowData.Ktext);
			this.wcSearchDialogClose();
		},

		wcClearForm: function () {
			sap.ui.getCore().byId("wcSearchWorkCenter").setValue("");
			sap.ui.getCore().byId("wcSearchDesciption").setValue("");
			var plant = this._orderModel.getProperty("/Order/Werks");
			sap.ui.getCore().byId("wcSearchPlant").setValue(plant);
		},

		wcSearchDialogClose: function () {
			this._wcSearchDialog.close();
			this.wcClearForm();
		},

		handleWcF4: function (oEvent) {
			//	var sInputValue = oEvent.getSource().getValue();
			if (!this._wcSearchDialog) {
				this._wcSearchDialog = sap.ui.xmlfragment(
					"com.espedia.demo.OrderCreation.view.fragments.WorkCenterSearchDialog",
					this
				);
				this.getView().addDependent(this._wcSearchDialog);
			}
			sap.ui.getCore().byId("wcSearchPlant").setEditable(false);
			this.wcClearForm();
			this.wcDialogSearch();
			this._wcSearchDialog.open();
		},

		// END HELP DI RICERCA
		//////////////////////////

		////////////////////////////////////////////////////
		// MODELLI JSON

		// Per qualche motivo il Fiori Launchpad non legge i dati dai file json nella cartella model. 
		// Per il momento includo i json nel controller

		orderCreationModel: {
			"Order": {
				"Orderid": "",
				"Equipment": "",
				"Funcloc": "",
				"Description": "",
				"CreatedBy": "",
				"CreatedOn": "",
				"Notificat": "",
				"NotifDescription": "",
				"NotifLongText": "",
				"OrderType": "",
				"Ernam": "",
				"Erdat": "",
				"Damage": "",
				"DamageCode": "",
				"DamageCodegrp": "",
				"DamageText": "",
				"CauseCode": "",
				"CauseCodegrp": "",
				"CauseText": "",
				"Breakdown": false,
				"MalfunctionStart": "",
				"MalfunctionEnd": "",
				"PlannedDate": new Date(),
				"Priority": "",
				"PriorityDescription": "",
				"WorkCenter": "",
				"WorkCenterDescr": "",
				"LongText": ""
			},

			"Operations": [],
			"Components": []
		},

		addComponentModel: {
			"NewComponents": [{
				"ItemNumber": "0010",
				"MatlDesc": "",
				"Material": "",
				"RequirementQuantity": "",
				"RequirementQuantityUnit": "",
				"Activity": ""
			}]
		},

		addOperationModel: {
			"NewOperations": [{
				"Activity": "0010",
				"Description": "",
				"DurationNormal": "",
				"Acttype": ""
			}]
		}
		// END MODELLI JSON
	});
});