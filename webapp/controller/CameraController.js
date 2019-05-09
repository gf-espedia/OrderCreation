sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
	"use strict";

	return Controller.extend("Camera.controller.Home", {

		onInit: function () {
			this.getView().byId("cameraPage").setModel(new JSONModel({ //modello di default gestito da controller (alias empty model)
				photos: []
			}));
		},

		/////////////////////////////////////////////
		//  EVENTS
		/////////////////////////////////////////////

		//funzione per le foto (collegata a Camera.js - contiene una libreria esterna)

		onSnapshot: function (oEvent) { //contiene l'elemento snapshot--> vedi Camera.js
			// The image is inside oEvent, on the image parameter,
			// let's grab it.
			var oModel = this.getView().byId("cameraPage").getModel();
			var aPhotos = oModel.getProperty("/photos");
			aPhotos.push({
				src: oEvent.getParameter("image")
			});
			oModel.setProperty("/photos", aPhotos);
			oModel.refresh(true);
		},

		//al cambio della selezione della foto i tasti di download e delete scompaiono. Richiamo nel metodo selectionChange associato a List.
		/*onSelectionChange: function (oEvent) {
			var photo = oEvent.getSource().getId();
			var selectedItems = this.byId(photo)._oSelectedItem;
			var idDown = selectedItems.mAggregations.content[0].mAggregations.items[1].mAggregations.items[0].sId;
			var idDel = selectedItems.mAggregations.content[0].mAggregations.items[1].mAggregations.items[1].sId;
			var bSelected = this.getView().byId("listPhoto").getSelectedItem().sId;
			if (bSelected !== undefined || bSelected == "") {
				this.byId(idDown).setVisible(true);
				this.byId(idDel).setVisible(true);
			} else {
				this.byId(idDown).setVisible(false);
				this.byId(idDel).setVisible(false);
			}
		},*/

		//cancella le foto alla selezione
		deletePhotos: function (oEvent) {
			var oModel = this.getView().getModel();
			var aPhotos = oModel.getProperty("/photos");
			var deletePhotos = oEvent.getSource().getBindingContext().getObject();
			for (var i in aPhotos) {
				if (aPhotos[i] === deletePhotos) {
					aPhotos.splice(i, 1);
					oModel.refresh(true);
					break;
				}
			}
		},

		//download delle foto. /photos

		onDownloadSelectedItems: function (oEvent) {

			//var oUploadCollection = oEvent.getSource().getId(); //prende l'id della view relativa
			//var oData = this.byId(oUploadCollection).getModel().getData();
			var downloadableContent = {}; //definisco il downloadableContent come un on oggetto, al cui interno posso inserire diverse properties. (senza le parentesi è solo una variabile)
			var selectedItems = this.byId("listPhoto").getSelectedContextPaths()[0]; //controllo sulla selezione della foto 

			if (selectedItems.lenght !== 0) { //controlla che il campo da scaricare sia selezionato. Caso contrario NON da errore

				downloadableContent = this.getView().getModel().getProperty(selectedItems); //setta la property all'elemento selezionato

				downloadableContent.fileName = jQuery.now().toString(); //ricava la data di adesso in msec (=sempre univoco) e lo usiamo come nome temporaneo per il file 
				downloadableContent.fileMimeType = downloadableContent.src.substring(5, 14); //tramite la substring 
				downloadableContent.fileContent = downloadableContent.src.substring(22);
			}
			//funzione: base64toBlob
			var blob = this.base64toBlob(downloadableContent.fileContent, downloadableContent.fileMimeType);
			var objectURL = URL.createObjectURL(blob);

			//tutta questa parte di codice serve per scaricare e creare il link nel browser
			var link = document.createElement('a');
			link.style.display = 'none';
			document.body.appendChild(link);

			link.href = objectURL;
			link.href = URL.createObjectURL(blob);
			link.download = downloadableContent.fileName;
			link.click();
		},

		//formato del file da scaricare (sempre lo stesso in base64)
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
		}

		//cambio di view alla selezione del tab (relativo all'app iniziale in cui vi erano predisposti due tab)
		// onTabSelect: function (oEvent) {
		// 	var oTab = oEvent.getParameter("key");
		// 	var oCamera = this.getView().byId("idCamera");
		// 	if (oTab !== "tab_webCamera") {
		// 		oCamera.stopCamera();
		// 	} else {
		// 		oCamera.rerender();
		// 	}
		// },
		//metodo per il ritorno alla HomePage in OrderCreation.controller

		// onBackToApp: function () {
		// 	var app = this.getView().byId("idAppControl");
		// 	var page = this.getView().byId("navCon");
		// 	app.to(page, "show");
		// 	var oCamera = this.getView().byId("idCamera");
		// 	oCamera.stopCamera();

		//}

	});
});