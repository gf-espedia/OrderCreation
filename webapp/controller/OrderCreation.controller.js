//orderCreation.controller
sap.ui.define([
	"com/espedia/demo/OrderCreation/controller/BaseController",
	//"sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	//"com/espedia/demo/OrderCreation/controller/utils-old/SearchHelp",
	"jquery.sap.global",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel",
	//librerie aggiunte per collegamento alla webCam e allegati
	"sap/m/UploadCollectionParameter",
	"sap/m/MessageToast",
	"sap/m/library",
	"sap/ui/core/format/FileSizeFormat"

], function (BaseController, MessageBox, jQuery, Filter, FilterOperator, JSONModel, UploadCollectionParameter, MessageToast,
	MobileLibrary, FileSizeFormat) {
	"use strict";
	//test

	var page = 0; //variabile globale conteggio pagine
	var idPage = ["qrCode", "orderCreatePage", "planning", "task", "component", "attachmentCamera"]; //id page array
	var streamGlobal;
	var closeCamera = false;
	var arrayObjTable = [];
	var arrayCompTable = [];

	return BaseController.extend("com.espedia.demo.OrderCreation.controller.OrderCreation", {
		uploadJSON: {}, //allegati
		onInit: function () {
			this.mutableJSONOrdCreate = JSON.parse(JSON.stringify(this.orderCreationModel));
			this._orderModel = new sap.ui.model.json.JSONModel(this.mutableJSONOrdCreate); //orderModel valido per l'intera app gestita con una pagina singola
			this.getView().byId("attachmentCamera").setModel(this._orderModel); //attachments
			this.getView().byId("cameraPage").setModel(new JSONModel({ //modello di default gestito da controller (alias empty model)
				photos: []
			})); //attachments
			this.scanCode();

			//attachments
			this.getView().byId("attachmentCamera").setModel(new sap.ui.model.json.JSONModel({ //id: attachments -> attachmentCamera
				"maximumFilenameLength": 80,
				"maximumFileSize": 10,
				"mode": MobileLibrary.ListMode.SingleSelectMaster,
				"uploadEnabled": true,
				"uploadButtonVisible": true,
				"enableEdit": true,
				"enableDelete": true,
				"visibleEdit": true,
				"visibleDelete": true,
				"listSeparatorItems": [
					MobileLibrary.ListSeparators.All,
					MobileLibrary.ListSeparators.None
				],
				"showSeparators": MobileLibrary.ListSeparators.All,
				"listModeItems": [{
					"key": MobileLibrary.ListMode.SingleSelectMaster,
					"text": "Single"
				}, {
					"key": MobileLibrary.ListMode.MultiSelect,
					"text": "Multi"
				}]
			}), "attachSettings");

			this.getView().byId("attachmentCamera").setModel(new sap.ui.model.json.JSONModel({ //id: attachments -> attachmentCamera
				"items": ["jpg", "txt", "ppt", "pptx", "doc", "docx", "xls", "xlsx", "pdf", "png"],
				"selected": ["jpg", "txt", "ppt", "pptx", "doc", "docx", "xls", "xlsx", "pdf", "png"]
			}), "fileTypes");

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
			arrayCompTable = [];
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
			//Visualizzazione delle componenti
			var OmodelComponent = new sap.ui.model.json.JSONModel();
			OmodelComponent.setData(this._orderModel.oData.Components);
			this.getView().setModel(OmodelComponent, "modelComponent");
			//Visualizzazione delle componenti
			this._newComponentDialog.close();
			this._newComponentDialog.destroy();
			this._newComponentDialog = undefined;
			arrayCompTable = [];
		},

		newCompLiveChange: function (oEvent) {
			this._newCompModel.refresh(); //ss
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
				if (arrayCompTable.length == 0) {
					arrayCompTable.push(sap.ui.getCore().byId("newComponentsTable").getItems()[0]);
				}
				arrayCompTable.push(sap.ui.getCore().byId("newComponentsTable").getItems()[(sap.ui.getCore().byId("newComponentsTable").getItems()
					.length - 1)]);
			}
		},

		removeComponentFromTable: function (oEvent) {
			var selectedRowOp = oEvent.oSource.oParent.oBindingContexts.modelComponent.sPath; //riga selezionata

			var oIndex = selectedRowOp.substring(1); //indice di riga

			//var OmodelComponent = new sap.ui.model.json.JSONModel(); //dichiarazione del modello usato per la visualizzazione delle op a tabella
			//OmodelComponent.setData(this._orderModel.oData.Components); //setta i dati nel modello

			//var data = OmodelComponent.oData
			var data = this._orderModel.oData.Components;

			data.splice(oIndex, 1); //cancella la riga selezionata e restituisce la riga selezionata

			var OmodelComponent = new sap.ui.model.json.JSONModel()
			OmodelComponent.setData(data); //setta i dati nel modello

			this.getView().setModel(OmodelComponent, "modelComponent");

		},

		finalCancelComp: function (oEvent) {
			var selectedRow = oEvent.oSource.oParent.oBindingContexts.undefined.sPath; //seleziona la riga della tabella
			var oIndex = selectedRow.split("/")[2]; //seleziona l'index relativo alla riga

			sap.ui.getCore().byId("newComponentsTable").removeItem(arrayCompTable[oIndex]); //rimuove gli elementi a front-end

			var data = sap.ui.getCore().byId("newComponentsTable").oModels.undefined.oData.NewComponents;
			data.splice(oIndex, 1); // rimuove i dati selezionati dal modello
			sap.ui.getCore().byId("newComponentsTable").oModels.undefined.refresh();
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
			arrayObjTable = [];
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

			//visualizzazione operazioni_ collegamento alla view con il path :// nella customList associata  (list id e label value)
			var OmodelSuper = new sap.ui.model.json.JSONModel();
			OmodelSuper.setData(this._orderModel.oData.Operations);
			this.getView().setModel(OmodelSuper, "modelSuper");

			this._newOperationDialog.close();
			this._newOperationDialog.destroy();
			this._newOperationDialog = undefined;
			arrayObjTable = [];
		},

		newOpLiveChange: function (oEvent) {
			this._newOpModel.refresh(); //ss

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
				if (arrayObjTable.length == 0) {
					arrayObjTable.push(sap.ui.getCore().byId("newOperationsTable").getItems()[0]);
				}
				arrayObjTable.push(sap.ui.getCore().byId("newOperationsTable").getItems()[(sap.ui.getCore().byId("newOperationsTable").getItems().length -
					1)]);
			}
		},

		removeOperationFromTable: function (oEvent) {

			var selectedRowOp = oEvent.oSource.oParent.oBindingContexts.modelSuper.sPath; //riga selezionata

			var oIndex = selectedRowOp.substring(1); //indice di riga

			var data = this._orderModel.oData.Operations;

			data.splice(oIndex, 1); //cancella la riga selezionata e restituisce la riga selezionata
			var OmodelSuper = new sap.ui.model.json.JSONModel(); //dichiarazione del modello usato per la visualizzazione delle op a tabella
			OmodelSuper.setData(data); //setta i dati nel modello

			this.getView().setModel(OmodelSuper, "modelSuper");
		},

		finalCancelOp: function (oEvent) {
			var selectedRow = oEvent.oSource.oParent.oBindingContexts.undefined.sPath; //seleziona la riga della tabella
			var oIndex = selectedRow.split("/")[2]; //seleziona l'index relativo alla riga

			sap.ui.getCore().byId("newOperationsTable").removeItem(arrayObjTable[oIndex]); //rimuove gli elementi a front-end

			var data = sap.ui.getCore().byId("newOperationsTable").oModels.undefined.oData.NewOperations;
			data.splice(oIndex, 1); // rimuove i dati selezionati dal modello
			sap.ui.getCore().byId("newOperationsTable").oModels.undefined.refresh();

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
			if (page == 0) {
				this.scanCode();
			} else if (page == 2) {
				this.getView().byId("PlantAndWC").setValue("1710 -");
			}
		},

		scanCode: function () {

			var that = this;

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
					that.closeCamera = true;
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
			video.id = "idVideo";
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
						//var funclocRead = JSON.parse(data).Order.Funcloc;
					} catch {}
					if (!equipRead /*|| !funclocRead*/ ) {
						MessageBox.alert(this.getView().getModel("i18n").getResourceBundle().getText("qrError"));
					} else {
						var app = this.getView().byId("navCon"); //pages are in the navConteiner
						app.to(this.byId(idPage[1]), "show");
						page = 1;
						this._orderModel.setProperty("/Order/Equipment", equipRead);
						//this._orderModel.setProperty("/Order/Funcloc", funclocRead);
						this.getView().byId("equnrInputOrd").setValue(equipRead);
						//this.getView().byId("equnrInputTplnr").setValue(funclocRead);

						//servizio per la functional location
						var oModel = this.getView().getModel(); //dichiarazione del modello oModel, come modello di default
						var sPath = "/EquipmentSearchHelpSet(Equnr='" + equipRead + "')";

						oModel.read(sPath, {
							"success": function (oData) {
								this._orderModel.setProperty("/Order/Funcloc", oData.Tplnr);
								this.getView().byId("equnrInputTplnr").setValue(oData.Tplnr);
							}.bind(this),
							"error": function (err) {
								sap.m.MessageBox.error(err.message);
							}
						});
						//fine chiamata servizio

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
						if (this.codeScanned || that.closeCamera) {
							video.srcObject.getTracks()[0].stop();
							that.closeCamera = false;
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
		},
		//fine  scanCode

		// START FILE UPLOADER   
		formatAttribute: function (sValue) {
			if (jQuery.isNumeric(sValue)) {
				return FileSizeFormat.getInstance({
					binaryFilesize: false,
					maxFractionDigits: 1,
					maxIntegerDigits: 3
				}).format(sValue);
			} else {
				return sValue;
			}
		},

		arrayJSONStringify: function (array) {
			for (var i = 0; i < array.length; i++) {
				if (typeof array[i] !== "string") {
					array[i] = JSON.stringify(array[i]);
				}
			}
			return array;
		},

		arrayJSONParse: function (array) {
			for (var i = 0; i < array.length; i++) {
				array[i] = JSON.parse(array[i]);
			}
			return array;
		},

		onChange: function (oEvent) {
			var that = this;
			var oUploadCollection = oEvent.getSource();
			// Header Token
			var oCustomerHeaderToken = new UploadCollectionParameter({
				name: "x-csrf-token",
				value: "securityTokenFromModel"
			});
			oUploadCollection.addHeaderParameter(oCustomerHeaderToken);

			var reader = new FileReader();
			var file = oEvent.getParameter("files")[0];
			that.uploadJSON = {};
			that.uploadJSON.fileId = jQuery.now().toString();
			that.uploadJSON.fileName = file.name;
			that.uploadJSON.fileMimeType = file.type;
			that.uploadJSON.fileDimension = (file.size / 1000).toFixed(2) + " kB";
			that.uploadJSON.fileExtension = file.name.split(".")[1];
			that.uploadJSON.fileUploadDate = new Date(jQuery.now()).toLocaleDateString();
			reader.onload = function (e) {
				that.uploadJSON.fileContent = e.target.result.substring(5 + that.uploadJSON.fileMimeType.length + 8);
			};

			reader.onerror = function (e) {
				sap.m.MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("errUpl"));
			};

			reader.readAsDataURL(file);

		},

		base64toBlob: function (base64Data, contentType) {
			contentType = contentType || '';
			var sliceSize = 1024;
			var byteCharacters = atob(base64Data);
			var bytesLength = byteCharacters.length;
			var slicesCount = Math.ceil(bytesLength / sliceSize);
			var byteArrays = new Array(slicesCount);

			for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
				var begin = sliceIndex * sliceSize;
				var end = Math.min(begin + sliceSize, bytesLength);
				var bytes = new Array(end - begin);

				for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
					bytes[i] = byteCharacters[offset].charCodeAt(0);
				}

				byteArrays[sliceIndex] = new Uint8Array(bytes);
			}

			return new Blob(byteArrays, {
				type: contentType
			});
		},

		onFileDeleted: function (oEvent) {
			this.deleteItemById(oEvent.getParameter("documentId"));
		},

		deleteItemById: function (sItemToDeleteId) {
			var oData = this.byId("attachmentCamera").getModel().getData(); //id: attachments -> attachmentCamera
			var aItems = jQuery.extend(true, {}, oData)["Attachments"];
			jQuery.each(aItems, function (index) {
				if (aItems[index] && aItems[index].fileId === sItemToDeleteId) {
					aItems.splice(index, 1);
				}
			});
			this.byId("attachmentCamera").getModel().getData()["Attachments"] = aItems; //id: attachments -> attachmentCamera
			this.byId("attachmentCamera").getModel().refresh(); //id: attachments -> attachmentCamera

			this.byId("attachmentTitle").setText(this.getAttachmentTitleText());
		},

		onFilenameLengthExceed: function () {
			MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("fileLenghtExc"));
		},

		onFileRenamed: function (oEvent) {
			var oData = this.byId("attachmentCamera").getModel().getData(); //id: attachments -> attachmentCamera
			var aItems = jQuery.extend(true, {}, oData)["Attachments"];
			var sDocumentId = oEvent.getParameter("documentId");
			jQuery.each(aItems, function (index) {
				if (aItems[index] && aItems[index].fileId === sDocumentId) {
					aItems[index].fileName = oEvent.getParameter("item").getFileName();
				}
			});
			this.byId("attachmentCamera").getModel().getData()["Attachments"] = aItems; //id: attachments -> attachmentCamera
			this.byId("attachmentCamera").getModel().refresh(); //id: attachments -> attachmentCamera
		},

		onFileSizeExceed: function () {
			MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("fileSizeExc"));
		},

		onTypeMissmatch: function () {
			MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("typeMiss"));
		},

		onUploadComplete: function () {
			var that = this;
			var oData = this.byId("attachmentCamera").getModel().getData(); //id: attachments -> attachmentCamera

			var blobForURL = this.base64toBlob(that.uploadJSON.fileContent, that.uploadJSON.fileMimeType);
			var fileURL = URL.createObjectURL(blobForURL);
			oData["Attachments"].unshift({
				"fileId": that.uploadJSON.fileId,
				"fileName": that.uploadJSON.fileName,
				"fileMimeType": that.uploadJSON.fileMimeType,
				"fileDimension": that.uploadJSON.fileDimension,
				"fileExtension": that.uploadJSON.fileExtension,
				"fileUploadDate": that.uploadJSON.fileUploadDate,
				"fileContent": that.uploadJSON.fileContent,
				"fileThumbnailUrl": "",
				"fileURL": fileURL,
				"attributes": [{
					"title": "Data di caricamento",
					"text": that.uploadJSON.fileUploadDate,
					"active": false
				}, {
					"title": "Dimensione",
					"text": that.uploadJSON.fileDimension,
					"active": false
				}],
				"selected": false
			});
			this.byId("attachmentCamera").getModel().refresh(); //id: attachments -> attachmentCamera
			that.uploadJSON = {};

			// Sets the text to the label
			this.byId("attachmentTitle").setText(this.getAttachmentTitleText());
		},

		onBeforeUploadStarts: function (oEvent) {
			// Header Slug
			var oCustomerHeaderSlug = new UploadCollectionParameter({
				name: "slug",
				value: oEvent.getParameter("fileName")
			});
			oEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);
		},

		onSelectAllPress: function (oEvent) {
			var oUploadCollection = this.byId("attachments"); //CONTROLLARE QUESTO ID!!! DOVREBBE ESSERE RELATIVO ALL'UPLOAD COLLECTION
			if (!oEvent.getSource().getPressed()) {
				this.deselectAllItems(oUploadCollection);
				oEvent.getSource().setPressed(false);
				oEvent.getSource().setText("Select all");
			} else {
				this.deselectAllItems(oUploadCollection);
				oUploadCollection.selectAll();
				oEvent.getSource().setPressed(true);
				oEvent.getSource().setText("Deselect all");
			}
			this.onSelectionChange(oEvent);
		},

		deselectAllItems: function (oUploadCollection) {
			var aItems = oUploadCollection.getItems();
			for (var i = 0; i < aItems.length; i++) {
				oUploadCollection.setSelectedItem(aItems[i], false);
			}
		},

		getAttachmentTitleText: function () {
			var aItems = this.byId("attachments").getItems(); //id: attachments -> attachmentCamera
			var nAllegati = this.getView().getModel("i18n").getResourceBundle().getText("Nallegati"); //i18n gestito con variabile dinamica
			nAllegati = nAllegati.replace("%var%", aItems.length);

			return nAllegati;
		},

		onModeChange: function (oEvent) {
			var oSettingsModel = this.getView().getModel("attachSettings");
			if (oEvent.getParameters().selectedItem.getProperty("key") === MobileLibrary.ListMode.MultiSelect) {
				oSettingsModel.setProperty("/visibleEdit", false);
				oSettingsModel.setProperty("/visibleDelete", false);
				this.enableToolbarItems(true);
			} else {
				oSettingsModel.setProperty("/visibleEdit", true);
				oSettingsModel.setProperty("/visibleDelete", true);
				this.enableToolbarItems(false);
			}
		},

		onSelectionChange: function () {
			var oData = this.byId("attachmentCamera").getModel().getData(); //id: attachments -> attachmentCamera
			var aSelectedItems = this.byId("attachments").getSelectedItems(); //id: attachments -> attachmentCamera
			if (aSelectedItems.length !== 0) {
				var selectedItemId = aSelectedItems[0].getDocumentId();
				var attach = oData["Attachments"];
				for (var k in attach) {
					if (attach[k].selected === true && attach[k].fileId !== selectedItemId) {
						attach[k].selected = false;
					}
				}
			}
		},

		onDownloadSelectedItems: function () {
			var oData = this.byId("attachmentCamera").getModel().getData(); //id: attachments -> attachmentCamera
			var aItems = jQuery.extend(true, {}, oData)["Attachments"];
			var aSelectedItems = this.byId("attachments").getSelectedItems(); //id: attachments -> attachmentCamera
			if (aSelectedItems.length !== 0) {
				var downloadableContent;
				jQuery.each(aItems, function (index) {
					if (aItems[index] && aItems[index].fileId === aSelectedItems[0].getDocumentId()) {
						downloadableContent = aItems[index];
					}
				});
				var blob = this.base64toBlob(downloadableContent.fileContent, downloadableContent.fileMimeType);
				var objectURL = URL.createObjectURL(blob);

				var link = document.createElement('a');
				link.style.display = 'none';
				document.body.appendChild(link);

				link.href = objectURL;
				link.href = URL.createObjectURL(blob);
				link.download = downloadableContent.fileName;
				link.click();
			}
		},

		// END FILE UPLOADER 

		//collegamento all'app della webCam

		onCameraOpen: function () { //controllare l'ordine degli id
			var app = this.byId("idAppControl");
			var page = this.byId("cameraPage");
			app.to(page, "show");
			var oCamera = this.getView().byId("idCamera");
			if (!firstOpenCamera) oCamera.rerender();
			firstOpenCamera = false;
			/*if(page.getId()!=="__component0---OrderCreation--cameraPage"){
				oCamera.stopCamera();
			}else{
				oCamera.rerender();
			}*/

		},
		//fine collegamento all'app della webCam

		//metodo per tornare alla view degli allegati. Inserito nel CameraController (anche qui funziona)

		onBackToApp: function () {
			var app = this.getView().byId("idAppControl");
			var page = this.getView().byId("navCon");
			var oCamera = this.getView().byId("idCamera");
			oCamera.stopCamera();
			app.to(page, "show");

		}

	});
});