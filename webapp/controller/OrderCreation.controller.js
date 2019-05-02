//orderCreation.controller
sap.ui.define([
	"com/espedia/demo/OrderCreation/controller/BaseController",
	//"sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	//"com/espedia/demo/OrderCreation/controller/utils-old/SearchHelp",
	"jquery.sap.global",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel"
], function (BaseController, MessageBox, jQuery, Filter, FilterOperator, JSONModel) {
	"use strict";
	//test

	var page = 0; //variabile globale conteggio pagine
	var idPage = ["qrCode", "orderCreatePage", "planning", "task", "component"]; //id page array
	var streamGlobal;

	return BaseController.extend("com.espedia.demo.OrderCreation.controller.OrderCreation", {
		onInit: function () {
			this.mutableJSONOrdCreate = JSON.parse(JSON.stringify(this.orderCreationModel));
			this._orderModel = new sap.ui.model.json.JSONModel(this.mutableJSONOrdCreate);
		},
		//link per l'apertura del calendario
		openCalendar: function () {
			window.open("https://workcentercalendar-m9a44f3468.dispatcher.hana.ondemand.com", "_blank");
		},

		// Wrapper per le chiamate odata singole
		orderCreationSave: function (boolRelease) {
			this.getView().setBusyIndicatorDelay(0);
			this.getView().setBusy(true);

			var oModel = this.getView().getModel();
			oModel.setUseBatch(true);
			var changeSetId = "abc";
			oModel.setDeferredGroups([changeSetId]);
			var mParameters = {
				"groupId": changeSetId,
				"changeSetId": changeSetId
			};

			var batchSuccess = function (oData) {
				this.getView().setBusy(false);
				sap.m.MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("OrderCreated"));
				this.refreshNotif();
				if (boolRelease) {
					this.navToScheduledOrders();
					this.refreshReleasedOrder();
				} else {
					this.navToOpenOrders();
					this.refreshOpenOrder();
				}
			}.bind(this);

			var batchError = function (err) {
				this.getView().setBusy(false);
				MessageBox.error(err.message);
			}.bind(this);

			this.odataOrderCreate(mParameters, boolRelease);
			this.odataOrderOperationCreate(mParameters);
			this.odataOrderComponentCreate(mParameters);
			this.getView().getModel().submitChanges({
				"groupId": changeSetId,
				"success": batchSuccess,
				"error": batchError
			});
		},

		odataOrderCreate: function (param, boolRelease) {
			var oModel = this.getView().getModel();
			var entity = {};
			entity["Equipment"] = this._orderModel.getProperty("/Order/Equipment");
			entity["OrderType"] = this.getView().byId("orderTypeSelect").getSelectedKey();
			entity["NotifNo"] = this._orderModel.getProperty("/Order/Notificat");
			entity["MnWkCtr"] = this._orderModel.getProperty("/Order/WorkCenter");
			entity["MnWkPlant"] = this._orderModel.getProperty("/Order/Werks");
			entity["Planplant"] = this._orderModel.getProperty("/Order/Werks");
			//this._orderModel.getProperty("/Order/WorkCenter");

			var startDate = this._orderModel.getProperty("/Order/PlannedDate");
			entity["StartDate"] = startDate;
			entity["ShortText"] = this._orderModel.getProperty("/Order/Description");
			entity["Priority"] = this.getView().byId("prioritySelectEdit").getSelectedKey();
			if (boolRelease) {
				entity["StatusToSet"] = "RELEASE";
			}

			entity["LongText"] = this._orderModel.getProperty("/Order/LongText");
			oModel.create("/OrderSet", entity, param);
		},

		odataOrderOperationCreate: function (param) { //operations
			var oModel = this.getView().getModel();
			var oper = this._orderModel.getProperty("/Operations");
			if (!(oper && oper.length > 0)) {
				return;
			}

			for (var i in oper) {
				oModel.create("/OperationSet", oper[i], param);
			}
		},

		odataOrderComponentCreate: function (param) { //components
			var comp = this._orderModel.getProperty("/Components");
			if (!(comp && comp.length > 0)) {
				return;
			}
			var oModel = this.getView().getModel();
			var plant = this._orderModel.getProperty("/Order/Werks");
			for (var i in comp) {
				comp[i].Plant = plant;
				oModel.create("/ComponentSet", comp[i], param);
			}
		},

		onOrderCreationSave: function () {
			if (this._orderModel.getProperty("/Order/WorkCenter").length < 1) {
				sap.m.MessageBox.error(this.getView().getModel("i18n").getResourceBundle().getText("InsertValidWorkCenter"));
				return;
			}
			MessageBox.confirm(this.getView().getModel("i18n").getResourceBundle().getText("CreateOrder"), {
				title: "Save", // default
				onClose: function (key) {
					if (key === "OK") {
						this.orderCreationSave(false);
					}
				}.bind(this)
			});
		},

		onOrderCreationRelease: function () {
			if (this._orderModel.getProperty("/Order/WorkCenter").length < 1) {
				sap.m.MessageBox.error(this.getView().getModel("i18n").getResourceBundle().getText("InsertValidWorkCenter"));
				return;
			}
			MessageBox.confirm(this.getView().getModel("i18n").getResourceBundle().getText("CreateRelease"), {
				title: this.getView().getModel("i18n").getResourceBundle().getText("SaveRelease"), // default
				onClose: function (key) {
					if (key === "OK") {
						this.orderCreationSave(true);
					}
				}.bind(this)
			});
		},

		onOrderCreationCancel: function () {
			//sap.m.MessageToast.show("Operation cancelled.");
			this._orderModel = null;
			this.navToNotif();
		},

		// END OPERAZIONI ORDINE

		// AGGIUNTA COMPONENTS ORDINE
		onComponentAdd: function () {
			if (this._orderModel.getProperty("/Operations").length < 1) {
				MessageBox.error(this.getView().getModel("i18n").getResourceBundle().getText("noOperationsFoundText"), {
					"title": this.getView().getModel("i18n").getResourceBundle().getText("noOperationsFoundTitle")
				});
				return;
			}

			var lastCompIndex = this._orderModel.getProperty("/Components").length - 1; //******??????????????????????????
			var newComp;
			if (lastCompIndex >= 0) {
				var lastComp = this._orderModel.getProperty("/Components/" + lastCompIndex + "/ItemNumber");
				newComp = String(parseInt(lastComp, 10) + 10).padStart(4, "0");
			} else {
				newComp = "0010";
			}

			if (!this._newComponentDialog) {
				this._newComponentDialog = sap.ui.xmlfragment("com.espedia.demo.OrderCreation.view.fragments.NewComponentDialog", this);
			}
			// Creo un clone del json modello, così quest'ultimo rimane inalterato e posso riutilizzarlo nei cicli successivi
			this.mutableJSONComp = JSON.parse(JSON.stringify(this.addComponentModel));
			this._newCompModel = new sap.ui.model.json.JSONModel(this.mutableJSONComp);
			this._newCompModel.setProperty("/NewComponents/0/ItemNumber", newComp);
			this.getView().addDependent(this._newComponentDialog);
			this._newComponentDialog.open();
			sap.ui.getCore().byId("newComponentsTable").setModel(this._newCompModel);

		},

		onNewComponentCancelPress: function () {
			this._newCompModel = null;
			this._newComponentDialog.close();
			this._newComponentDialog.destroy();
			this._newComponentDialog = undefined;
		},

		onNewComponentConfirmPress: function () {
			var lastIndex = this._newCompModel.getProperty("/NewComponents").length - 1;
			var lastRow = "/NewComponents/" + lastIndex + "/";
			if (
				this._newCompModel.getProperty(lastRow + "Material").length === 0 &&
				this._newCompModel.getProperty(lastRow + "RequirementQuantity").length === 0 &&
				this._newCompModel.getProperty(lastRow + "RequirementQuantityUnit").length === 0 &&
				this._newCompModel.getProperty(lastRow + "Activity").length === 0
			) {
				this._newCompModel.getProperty("/NewComponents").pop();
			}

			this._orderModel.setProperty("/Components", this._orderModel.getProperty("/Components").concat(this._newCompModel.getProperty(
				"/NewComponents")));
			this._newCompModel = null;
			this._newComponentDialog.close();
			this._newComponentDialog.destroy();
			this._newComponentDialog = undefined;
		},

		newCompLiveChange: function (oEvent) {
			//  this._newOpModel
			var lastIndex = this._newCompModel.getProperty("/NewComponents").length - 1;
			var lastRow = "/NewComponents/" + lastIndex + "/";
			if (
				this._newCompModel.getProperty(lastRow + "Material").length > 0 &&
				this._newCompModel.getProperty(lastRow + "RequirementQuantity").length > 0 &&
				this._newCompModel.getProperty(lastRow + "RequirementQuantityUnit").length > 0 &&
				this._newCompModel.getProperty(lastRow + "Activity").length > 0
			) {
				var newEmptyComp = {
					"ItemNumber": String(parseInt(this._newCompModel.getProperty(lastRow + "ItemNumber"), 10) + 10).padStart(4, "0"),
					"Material": "",
					"RequirementQuantity": "",
					"RequirementQuantityUnit": "",
					"Activity": ""
				};
				this._newCompModel.getProperty("/NewComponents").push(newEmptyComp);
				this._newCompModel.refresh();
			}
		},

		removeComponentFromTable: function (oEvent) {
			var selectedRow = oEvent.getSource().getBindingContext().getPath();
			var oIndex = parseInt(selectedRow.substring(selectedRow.lastIndexOf('/') + 1), 10);
			var data = this._orderModel.getProperty("/Components");
			data.splice(oIndex, 1);
			this._orderModel.setProperty("/Components", data);
			this._orderModel.refresh();
		},
		// END AGGIUNTA COMPONENTS ORDINE
		////////////////////////////////

		//chiamata al servizio: NotifTypeCustSet() per il problemType. Richiamato nella OrderEditPage nella select
		onAfterRendering: function () {
			var oModel = this.getView().getModel(); //dichiarazione del modello oModel, come modello di default
			var sPath = "/NotifTypeCustSet()";

			oModel.read(sPath, {
				"success": function (oData) {
					//per il collegamento alla select tramite modello
					var problTypeModel = new JSONModel(oData);
					this.getView().setModel(problTypeModel, "problType");

				}.bind(this),
				"error": function (err) {
					sap.m.MessageBox.error(err.message);
				}
			});
			//fine chiamata al servizio
		},

		// AGGIUNTA OPERATIONS ORDINE
		onOperationAdd: function () {
			var lastOpIndex = this._orderModel.getProperty("/Operations").length - 1;
			var newActivity;
			if (lastOpIndex >= 0) {
				var lastActivity = this._orderModel.getProperty("/Operations/" + lastOpIndex + "/Activity");
				newActivity = String(parseInt(lastActivity, 10) + 10).padStart(4, "0");
			} else {
				newActivity = "0010";
			}
			if (!this._newOperationDialog) {
				this._newOperationDialog = sap.ui.xmlfragment("com.espedia.demo.OrderCreation.view.fragments.NewOperationDialog", this);
			}
			// Creo un clone del json modello, così quest'ultimo rimane inalterato e posso riutilizzarlo nei cicli successivi
			this.mutableJSONOper = JSON.parse(JSON.stringify(this.addOperationModel));
			this._newOpModel = new sap.ui.model.json.JSONModel(this.mutableJSONOper);
			this._newOpModel.setProperty("/NewOperations/0/Activity", newActivity);
			this.getView().addDependent(this._newOperationDialog);
			this._newOperationDialog.open();
			sap.ui.getCore().byId("newOperationsTable").setModel(this._newOpModel);
		},

		onNewOperationCancelPress: function () {
			this._newOpModel = null;
			this._newOperationDialog.close();
			this._newOperationDialog.destroy();
			this._newOperationDialog = undefined;
		},

		onNewOperationConfirmPress: function () {
			var lastIndex = this._newOpModel.getProperty("/NewOperations").length - 1;
			var lastRow = "/NewOperations/" + lastIndex + "/";
			if (
				this._newOpModel.getProperty(lastRow + "Description").length === 0 &&
				this._newOpModel.getProperty(lastRow + "Acttype").length === 0 &&
				this._newOpModel.getProperty(lastRow + "DurationNormal").length === 0
			) {
				this._newOpModel.getProperty("/NewOperations").pop();
			}

			this._orderModel.setProperty("/Operations", this._orderModel.getProperty("/Operations").concat(this._newOpModel.getProperty(
				"/NewOperations")));
			this._newOpModel = null;
			this._newOperationDialog.close();
			this._newOperationDialog.destroy();
			this._newOperationDialog = undefined;

		},

		newOpLiveChange: function (oEvent) {
			var lastIndex = this._newOpModel.getProperty("/NewOperations").length - 1;
			var lastRow = "/NewOperations/" + lastIndex + "/";
			if (
				this._newOpModel.getProperty(lastRow + "Description").length > 0 &&
				this._newOpModel.getProperty(lastRow + "DurationNormal").length > 0
			) {
				var newEmptyOp = {
					"Activity": String(parseInt(this._newOpModel.getProperty(lastRow + "Activity"), 10) + 10).padStart(4, "0"),
					"Description": "",
					"DurationNormal": "",
					"Acttype": ""
				};
				this._newOpModel.getProperty("/NewOperations").push(newEmptyOp);
				this._newOpModel.refresh();
			}
		},

		removeOperationFromTable: function (oEvent) {
			var selectedRow = oEvent.getSource().getBindingContext().getPath();
			var oIndex = parseInt(selectedRow.substring(selectedRow.lastIndexOf('/') + 1), 10);
			var data = this._orderModel.getProperty("/Operations");
			data.splice(oIndex, 1);
			this._orderModel.setProperty("/Operations", data);
			this._orderModel.refresh();
		},

		//navigation forward (right)
		handleNavRight: function (evt) {

			page++;
			if (page >= idPage.lenght) {
				page = idPage.lenght - 1;
			}

			this._openPage();

		},
		//back navigation (left)
		handleNavLeft: function (evt) {

			page--;
			if (page < 0) {
				page = 0;
			}
			this._openPage();

		},
		//open new page using th navigation container
		_openPage: function () {
			var app = this.getView().byId("navCon"); //pages are in the navConteiner
			var selectedPage = this.byId(idPage[page]);
			app.to(selectedPage, "show");
		},

		scanCode: function (oEvent) {
				this.codeScanned = false;
				var container = new sap.m.VBox({
					"width": "512px",
					"height": "384px"
				});
				var button = new sap.m.Button("", {
					text: "Cancel",
					type: "Reject",
					press: function () {
						dialog.close();
					}
				});
				var dialog = new sap.m.Dialog({
					title: "Scan Window",
					content: [
						container,
						button
					]
				});
				dialog.open();
				var video = document.createElement("video");
				video.id ="idVideo";
				streamGlobal = video;				
				video.autoplay = true;
				var that = this;
				qrcode.callback = function (data) {
					if (data !== "error decoding QR Code") {
						this.codeScanned = true;
						that._oScannedInspLot = data;
						//that.byId("datiScan").setValue(data); //gestione  dell'input da view

						var oModel = that.getView().getModel();

						oModel.setProperty("/data", data); //popola il singolo campo del modello. nel caso fosse un array data=[] --> usare il push (vedi app webCam)
						oModel.refresh(true);
						//MessageBox.alert(data);//Message Pops up for scanned Value
						dialog.close();

						try {
							var equipRead = JSON.parse(data).Order.Equipment;
							var funclocRead = JSON.parse(data).Order.Funcloc;
						} catch {}
						if (!equipRead || !funclocRead) {
							MessageBox.alert(this.getView().getModel("i18n").getResourceBundle().getText("qrError"));
						} else {
							var app = this.getView().byId("navCon"); //pages are in the navConteiner
							app.to(this.byId(idPage[1]), "show");
							page = 1;
							this._orderModel.setProperty("/Order/Equipment", equipRead);
							this._orderModel.setProperty("/Order/Funcloc", funclocRead);
							this.getView().byId("equnrInputOrd").setValue(equipRead);
							this.getView().byId("equnrInputTplnr").setValue(funclocRead);
						}

					}
				}.bind(this);

				var canvas = document.createElement("canvas");
				canvas.width = 512;
				canvas.height = 384;
				navigator.mediaDevices.getUserMedia({
						audio: false,
						video: {
							facingMode: "environment",
							width: {
								ideal: 512
							},
							height: {
								ideal: 384
							}
						}
					})
					.then(function (stream) {
						video.srcObject = stream;
						var ctx = canvas.getContext('2d');
						var loop = (function () {
							if (this.codeScanned) {
								video.srcObject.getTracks()[0].stop();
								return;
							} else {
								ctx.drawImage(video, 0, 0);
								setTimeout(loop, 1000 / 30); // drawing at 30fps
								qrcode.decode(canvas.toDataURL());
							}
						}.bind(this));
						loop();
					}.bind(this))
					.catch(function (error) {
						MessageBox.error("Unable to get Video Stream");
					});

				container.getDomRef().appendChild(canvas);
			} //fine  scanCode
	});
});