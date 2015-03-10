// Gestisce la visualizzazione come le evidenziazioni, carica le annotazioni e i filtri

var endpointFusekiURL = "http://giovanna.cs.unibo.it:8181/data/";
var listaAutoriAnnotazioni = [];
listaAnnotazioni.data = []; //lista annotazioni del documento selezionato
//Variabile globale contenente tutti i possibili prefissi a livello di query/update sparql
var prefix = "\
        PREFIX foaf:  <http://xmlns.com/foaf/0.1/>\
        PREFIX frbr:  <http://purl.org/vocab/frbr/core#>\
        PREFIX xml:   <http://www.w3.org/XML/1998/namespace>\
        PREFIX aop:   <http://vitali.web.cs.unibo.it/AnnOtaria/person/>\
		PREFIX ao:    <http://vitali.web.cs.unibo.it/AnnOtaria/>\
        PREFIX fabio: <http://purl.org/spar/fabio/>\
        PREFIX au:    <http://description.org/schema/>\
        PREFIX dcterms: <http://purl.org/dc/terms/>\
        PREFIX schema: <http://schema.org/>\
        PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#>\
        PREFIX oa:    <http://www.w3.org/ns/oa#>\
        PREFIX xsd:   <http://www.w3.org/2001/XMLSchema#>\
        PREFIX rdf:   <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\
        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\
        PREFIX sem:   <http://www.ontologydesignpatterns.org/cp/owl/semiotics.owl#>\
        PREFIX cito:   <http://purl.org/spar/cito/>\
        PREFIX dbpedia: <http://dbpedia.org/ontology/>";

/*
	Esegue l'escape del nome dell'articolo per fare la select a fuseki
	@param nameArticle: nome del documento
*/
function IgnoreBracketArticleName(nameArticle){
    return nameArticle.replace("(", "\\(").replace(")", "\\)");
}


function selectAnnotazioniDocumento(documento){
    //Svuoto gli eventuali autori scaricati precedentemente
    listaAutoriAnnotazioni = [];
    //Svuoto le eventuali annotazioni scaricate precedentemente
    listaAnnotazioni.data = [];
    //Recupero le annotazioni sul documento
    articleName = IgnoreBracketArticleName(documento);
    var myquery = prefix + "\
	SELECT DISTINCT ?author ?author_fullname ?author_email\
   	?date ?label ?type ?body_s ?body_p ?body_o ?body_l\
   	?skos_label ?person_label ?rapresentation_label\
   	WHERE {\
   		?annotation rdf:type oa:Annotation ;\
       		oa:annotatedBy ?author ;\
       		oa:annotatedAt ?date;\
       		ao:type ?type;\
       		oa:hasBody ?body ;\
       		oa:hasTarget ao:"+ articleName + ";\
       		rdfs:label ?label.\
 		?author foaf:name ?author_fullname;\
     		schema:email ?author_email.\
 		?body rdf:subject ?body_s;\
     		rdf:predicate ?body_p;\
     		rdf:object ?body_o;\
     		rdfs:label ?body_l.\
 		OPTIONAL { ?body_o rdfs:label ?skos_label }\
 		OPTIONAL { ?body_o foaf:name ?person_label }\
 		OPTIONAL { ?body_o fabio:hasRapresentation ?rapresentation_label}\
   	}\
 	ORDER BY ASC(?date)";
	//Encoding della query in modo da poterla inviare correttamente
    var encodedquery = encodeURIComponent(myquery);
	//Dichiaro il formato dell'output
    var queryUrl = endpointFusekiURL + "query?query=" + encodedquery + "&format=" + "json";
    $.ajax({
        dataType: "jsonp",
        url: queryUrl,
        success: function(d) {
        	parseAnnotations(d.results.bindings, articleName);
        	console.log(d.results.bindings.length);
        },
        error: function(a,b,c) {
            alert("Errore nel caricamento delle annotazioni");
        }
    });
    //Annotazioni frammento
    myquery = prefix + "\
    SELECT DISTINCT ?author ?author_fullname ?author_email\
	?date ?label ?type ?body_s ?body_p ?body_o ?body_l\
    ?idElemento ?annotInizio ?annotFine\
    ?skos_label ?person_label ?rapresentation_label\
    WHERE {\
    	?annotation rdf:type oa:Annotation ;\
        	oa:annotatedBy ?author ;\
        	oa:annotatedAt ?date;\
    		ao:type ?type;\
          	oa:hasBody ?body ;\
          	rdfs:label ?label;\
          	oa:hasTarget ?bnode .\
      	?bnode  rdf:type oa:SpecificResource ;\
			oa:hasSource ao:" + articleName + " ;\
          	oa:hasSelector ?selector .\
      	?selector rdf:type oa:FragmentSelector ;\
          	rdf:value ?idElemento ;\
          	oa:start ?annotInizio ;\
          	oa:end ?annotFine. \
    	?author foaf:name ?author_fullname;\
        	schema:email ?author_email.\
    	?body rdf:subject ?body_s;\
        	rdf:predicate ?body_p;\
        	rdf:object ?body_o;\
        	rdfs:label ?body_l.\
    	OPTIONAL { ?body_o rdfs:label ?skos_label }\
    	OPTIONAL { ?body_o foaf:name ?person_label }\
    	OPTIONAL { ?body_o fabio:hasRapresentation ?rapresentation_label}\
    }";
    encodedquery = encodeURIComponent(myquery);
    queryUrl = endpointFusekiURL + "query?query=" + encodedquery + "&format=" + "json";
    $.ajax({
        dataType: "jsonp",
        url: queryUrl,
        success: function(d) {
    		parseAnnotations(d.results.bindings, articleName);
    		console.log(d.results.bindings.length);
        	highlightAnnotations();
        	fillSelectAutori();
    	},
        error: function(a,b,c) {
            alert("Errore nel caricamento delle annotazioni");
        }
    });
}

/*
	Parsa le annotazioni restituite da fuseki per renderle intellegibili
	@param _arrayAnnotations: array delle annotazioni
	@param _articleName: nome dell'articolo (path)
*/
function parseAnnotations(_arrayAnnotations, _articleName){
	var idAnnot = listaAnnotazioni.data.length;
	var i = 0;
	while (i < _arrayAnnotations.length){
		var temp = _arrayAnnotations[i];
		//Costruisco l'annotazione secondo il nostro formato
		var annotation = {
			id: idAnnot,
			//Campi dell'annotazione
			annotazione: {
				label: temp.label ? temp.label.value : null ,
				//Tipo dell'annotazione
				type: temp.type.value,
				body: {
					subject: temp.body_s.value ,
					predicate: temp.body_p.value,
					object: temp.body_o.value,
					label: temp.body_l ? temp.body_l.value : temp.body_o.value
				}
			},
			//Posizione dell'annotazione all'interno del documento
			pos_annot : {
				articolo : _articleName,
				//Id dell'elemento annotato, se l'annotazione è di tipo Documento non lo possiede
				id: temp.idElemento ? temp.idElemento.value : null,
				inizio_annotazione: temp.annotInizio ? temp.annotInizio.value : null,
				fine_annotazione: temp.annotFine ? temp.annotFine.value : null
			},
			origine : {
				autore : {
					//Vengono previsti eventuali autori non definiti
					name: temp.author_fullname ? temp.author_fullname.value : "non definito",
					email: temp.author_email ? temp.author_email.value : "non definito"
				},
				time: temp.date.value
			}
		}
		//Aggiungo l'annotazione alla lista
		listaAnnotazioni.data.push(annotation);
		//Se autore è definito lo aggiungo alla lista (servirà per filtrare annotazioni), evitando ripetizioni
		if(temp.author_fullname != null && listaAutoriAnnotazioni.indexOf(temp.author_fullname.value) === -1){
			listaAutoriAnnotazioni.push(temp.author_fullname.value);
		}
		idAnnot++;
		i++;
	}
}

/*
	Evidenzia le annotazioni sul frammento in base al tipo di annotazione
*/
function highlightAnnotations(){
	//Gestisco la pulizia delle info documento al cambio articolo
	cleanInfoDocumento();
	$(".annotation").contents().unwrap();
	$("#contenitore_ann").empty();
	//Analizzo annotazioni già memorizzate
	for(var i = 0; i < listaAnnotazioni.data.length; i++){
		var ann = listaAnnotazioni.data[i];
		//Se hanno un id (riferito ad elemento annotato sul documento) sono annotazioni sul frammento
		if(ann.pos_annot.id){
			var _inizio = ann.pos_annot.inizio_annotazione;
			var _fine = ann.pos_annot.fine_annotazione;
			var node = $("#" + ann.pos_annot.id);
      var children = [];
			if (node.length){
				node = $("#" + ann.pos_annot.id)[0];
				/*Creo un range riferito al nodo che ci interessa, in modo da poter recuperare tutti i suoi nodi discendenti,
					che siano di tipo testo*/
				var range = rangy.createRange();
				range.selectNodeContents(node);
				children = range.getNodes([3]);
				//Cerco i nodi in cui inizia e finisce l'annotazione
				var result = findStartEnd(children, _inizio, _fine);
				//Nodi che contengono l'annotazione
				var nodi_annotazione = result[0];
				//Offset iniziale, relativo al primo nodo
				var off_start = result[1];
				//Offset finale, relativo all'ultimo nodo
				var off_end = result[2];
				createFragmentAnnotation(nodi_annotazione, off_start, off_end, ann);
			}
		}else{	//Altrimenti sono annotazioni documento
			printDocumentAnnotation(ann);
		}
		//Setto gli attributi da mostrare nella modale e la creo
		var attributi = {
			autore: ann.origine.autore.name,
			email: ann.origine.autore.email,
			date: ann.origine.time,
			tipo: ann.annotazione.label,
			oggetto: ann.annotazione.body.label
		}
		createModal(ann.id, attributi);
	}
	//Per ogni annotazione verifico se è multipla
	var span_annotazioni = $(".annotation");
	$.each(span_annotazioni,function(){
		//Se annotazione ha annotazioni figlie
		if($(this).find(".annotation").length >0){
			//Aggiungo classe per CSS
			$(this).addClass("annot_multiple");
			//Aggiungo attributo per risalire a quali annotazioni sono multiple (utile nel filtraggio)
			$(this).attr("annot-mult", "true");
			$(this).find(".annotation").addClass("annot_multiple");
			$(this).find(".annotation").attr("annot-mult", "true");
		}
	});
	//Analizzo eventuali annotazioni temporanee
	for(var i = 0; i < annotazioniTemp.length; i++){
		var annTemp = annotazioniTemp[i];
		var articolo = annTemp.pos_annot.articolo;
		//Se annotazione temporanea analizzata è del documento selezionato
		if(articolo.substring(3, articolo.length-5) == docSelected){
			visualizzaAnnTemp(annTemp);
		}
	}
}

/*
	Elimina tutte le informazioni del documento precedentemente visualizzato (svuota pannello "Info Documento")
*/
function cleanInfoDocumento(){
	$('#hasAuthor-list li').remove();
	$('#hasPublicationYear-list li').remove();
	$('#hasPublisher-list li').remove();
	$('#hasTitle-list li').remove();
	$('#hasAbstract-list li').remove();
	$('#hasComment-list li').remove();
	$('#hasShortTitle-list li').remove();
}

/*
	Crea annotazione di tipo Frammento
	@param nodi: elementi per creare il range dell'annotazione
	@param start: valore di dove inizia l'annotazione
	@param end: valore di dove finisce l'annotazione
	@param ann: annotazione da evidenziare
*/
function createFragmentAnnotation(nodi, start, end, ann){
	for (var i = 0; i < nodi.length; i++) {
		var range = document.createRange();
		//Primo nodo, setto lo start dell'annotazione
		if (i == 0){
			range.setStart(nodi[i], start);
		}
		else{
			range.setStartBefore(nodi[i]);
		}
		//Ultimo nodo, setto l'end dell'annotazione
		if (i == nodi.length-1){
			range.setEnd(nodi[i], end);
		}
		else{
			range.setEndAfter(nodi[i]);
		}
	}
	//Creo annotazione sul documento utilizzando <span>
	var span = document.createElement('span');
	//Setto attributi e azioni
	span.setAttribute("class", "annotation " + ann.annotazione.type + "_attiva");
	//Parametro dell'azione è id dell'annotazione all'interno della lista
	span.setAttribute("onclick", "viewAnnotationDetails(" + ann.id + ")");
	span.setAttribute("data-id", ann.id);
	span.setAttribute("data-author", ann.origine.autore.name);
	span.setAttribute("data-time", ann.origine.time);
	span.setAttribute("data-type", ann.annotazione.type);
	range.surroundContents(span);
}

/*
	Cerca i valori inizio e fine dell'annotazione da evidenziare per saper dove creare il frammento dell'annotazione
	@param nodi
	@param start
	@param end
*/



function findStartEnd(nodi, start, end){
	var i, offset = 0;
	var nodi_ann = [];
	//Ciclo sui nodi figli per trovare il nodo da cui parte la selezione
	for (i = 0; i < nodi.length; i++){
		var length = $(nodi[i]).text().length;
		//Se la lunghezza del nodo in esame, mi fa sforare rispetto allo start allora mi fermo perche' ho trovato il nodo iniziale
		if( (offset + length) > start){
			break;
		}
		offset += length;
	}
	//Setto l'offset-Start in modo che sia relativo al nodo-figlio che contiene la selezione
	var off_start = start - offset;
	nodi_ann.push(nodi[i]);
	//Aumento l'offset e incremento il contatore perche' altrimenti tornerei a valutare il nodo dove inizia lo start
	offset = offset + $(nodi[i]).text().length;
	i++;
	//Faccio la stessa cosa per trovare il nodo in cui termina la selezione (e mi salvo anche tutti i nodi intermedi)
	for(i ; i < nodi.length; i++) {
		//Se l'offset sfora rispetto all'end allora mi fermo perche' ho trovato il nodo finale
		if(offset >= end){
			break;
		}
		offset += $(nodi[i]).text().length;
		nodi_ann.push(nodi[i]);
	}
	var off_end = $(nodi[i-1]).text().length - (offset - end);
	var result = [];
	result.push(nodi_ann);
	result.push(off_start);
	result.push(off_end);
	return result;
}

/*
	Inserisce una annotazione di tipo Documento nel pannello "Info Documento" sotto il tipo corrispondente
	@param annotation: annotazione Documento da inserire
*/
function printDocumentAnnotation(annotation){
	var li = $('<li></li>');
	var span = $('<span></span>');
	span.text(annotation.annotazione.body.label);
	span.attr('class', 'document-annotation-span');
	span.attr('onclick', 'viewAnnotationDetails(' + annotation.id + ')');
	//Setto gli attributi data- per gestire i filtri su autore e su data di annotazione
	li.attr('data-id', annotation.id);
	li.attr('data-author', annotation.origine.autore.name);
	li.attr('data-time', annotation.origine.time);
	li.attr('data-type', annotation.annotazione.type);
	li.append(span);
	$('#' + annotation.annotazione.type + '-list').append(li);
}

/*
	Carica gli autori delle annotazioni nella select corrispondente
*/
function fillSelectAutori(){
	$('#select-autore-annotazione').empty();
	$('#select-autore-annotazione').append($("<option></option>").attr("value", "default").text("Nessun filtro autore"));
	//Per ogni autore compongo <option> con coppia chiave-valore
	for(var i = 0; i < listaAutoriAnnotazioni.length; i++){
		$('#select-autore-annotazione').append($("<option></option>").attr("value", i).text(listaAutoriAnnotazioni[i]));
	}
}

/*
	Crea la finestra modale contenente tutte le informazioni dell'annotazione
	@param id: id della modale da creare
	@param data: dati dell'annotazione
*/
function createModal(id, data){
	//Creo finestra modale vuota
	var modal ="<div id='" + id + "'style='display: none;' data-type='" + data.tipo + "' class='dialogAnnotazione'></div>";
	//Appendo al contenitore generico
	$("#contenitore_ann").append(modal);
	//Inserisco tutte le informazioni dell'annotazione (Autore, Email, Data, Tipo e Oggetto) e termino creazione
	var modalDetail = '<div class="modal-dialog"><div class="modal-content">';
	modalDetail = modalDetail + "<div class=' modal-header'><button data-dismiss='modal' class='close' type='button'><span aria-hidden='true'>×</span></button>";
	modalDetail = modalDetail +  "<h4 class ='modal-title'>Annotazione</h4></div><div class='modal-body'>";
	modalDetail = modalDetail + "<div><span class='glyphicon glyphicon-user'> Autore: "+ data.autore +"</span></div><br />";
	modalDetail = modalDetail + "<div><span class='glyphicon glyphicon-envelope'> Mail: " + data.email + "</span></div><br />";
	modalDetail = modalDetail + "<div><span class='glyphicon glyphicon-calendar'> Data: " + data.date + "</span></div><br />";
	modalDetail = modalDetail + "<div><span class='glyphicon glyphicon-info-sign'> Tipo: " + data.tipo + "</span></div><br />";
	modalDetail = modalDetail + "<div><span class='glyphicon glyphicon-tag'> Oggetto: <p class='well'>" + data.oggetto + "</p></span></div>";
	modalDetail = modalDetail + "</div></div></div>";
	//Appendo contenitore di informazioni a modale vuota
	$("#" + id).append(modalDetail);
}

/*
	Mostra la finestra modale contenente i dettagli dell'annotazione
	@param _id: id dell'annotazione (posizione all'interno della lista)
*/
function viewAnnotationDetails(_id){
	//Mostro contenitore generico di tutte le annotazioni
	$('#contenitore_ann').modal("show");
	//Mostro la modale dell'annotazione
	$("#" + _id).css("display", "block");
}

/*
	Gestisce la chiusura della dialog contenente le info di una annotazione
*/
function chiudiDialog(){
	$("#contenitore_ann").click(function(){
		$(".dialogAnnotazione").css("display", "none");
		$("#contenitore_ann").modal("hide");
	});
}

/*
	Filtra le annotazioni di tipo Documento (contenute nel pannello "Info Documento")
	@param _filtro: tipo filtro selezionato
	@param _idFiltro: id del bottone filtro selezionato
*/
function filteringDocumentAnnotation(_filtro, _idFiltro){
	//Se il bottone filtro viene cliccato devo nascondere
	if($("#" + _idFiltro).hasClass('attiva')){
		//Per nascondere, prelevo solo elementi visibili che abbiano lo stesso tipo di dato
		var liDocumentInfo = $("#document-annotation-list li[data-type=" + _filtro +"]").not(":hidden");
		//Se esistono annotazioni del tipo da filtrare, nascondo e disattivo bottone
		if(liDocumentInfo.length != 0){
			for(var i = 0; i < liDocumentInfo.length; i++){
				$(liDocumentInfo[i]).hide();
			}
			$("#" + _idFiltro).removeClass('attiva');
		}
	}
	//Altrimenti devo mostrare
	else {
		//Per mostrare, prelevo solo elementi nascosti che abbiano lo stesso tipo di dato
		var liDocumentInfo = $("#document-annotation-list li[data-type=" + _filtro +"]").filter(":hidden");
		for (var i = 0; i < liDocumentInfo.length; i++){
			var liAnnotation = $(liDocumentInfo[i]);
			//Se i filtri autore e data sono attivi le condizioni di entrambi devono essere soddisfatte per mostrare
			if($("#select-autore-annotazione").val() != "default" && $('#check-date-filter').is(':checked')){
				var autoreSelect = $("#select-autore-annotazione option:selected").text();
				var autoreLi = liAnnotation.attr("data-author");
				var date = $('#date-setter').val();
				var liDate = liAnnotation.attr("data-time").substring(0,10);
				//Se l'autore selezionato corrisponde a quello dell'annotazione e la data è maggiore di quella inserita
				if(autoreLi === autoreSelect && liDate >= date){
					liAnnotation.show();
				}
			}
			//Altrimenti analizzo solo filtro autore
			else if($("#select-autore-annotazione").val() != "default"){
				var autoreSelect = $("#select-autore-annotazione option:selected").text();
				var autoreLi = liAnnotation.attr("data-author");
				if(autoreLi === autoreSelect){
					liAnnotation.show();
				}
			}
			//Altrimenti analizzo solo filtro data
			else if($('#check-date-filter').is(':checked')){
				var date = $('#date-setter').val();
				var liDate = liAnnotation.attr("data-time").substring(0,10);
				if(liDate >= date){
					liAnnotation.show();
				}
			}
			//Altrimenti nessuno dei due è attivo
			else{
				liAnnotation.show();
			}
		}
		$("#" + _idFiltro).addClass('attiva');
	}
}

/*
	Filtra le annotazioni in base all'autore
*/
function filteringByAuthor(){
	//Al cambio del valore nella select
	$("#select-autore-annotazione").change(function() {
		//Se è stato selezionato 'Nessun filtro autore'
		if($("#select-autore-annotazione").val() === 'default'){
			/*Ottengo tutti i frammenti già filtrati per verificare se mostrarli nuovamente.
				Se frammenti sono già attivi non c'è bisogno di analizzarli*/
			var listaAnnCaricate = $("span[class^=annotation]").filter(".hasFiltro");
			for(var i = 0; i < listaAnnCaricate.length; i++){
				var ann = $(listaAnnCaricate[i]);
				var annType = ann.attr("data-type");
				//Se filtro data è attivo
				if($('#check-date-filter').is(':checked')){
					var date = $('#date-setter').val();
					var dateAnn = ann.attr("data-time").substring(0,10);
					//Se la data è successiva o uguale e il tipo di annotazione Frammento non è filtrato
					if(dateAnn >= date && $("#filtri-frammento label[fragment-type=" + annType + "]").not(".hasFiltro").length){
						ann.removeClass("hasFiltro");
						//Aggiungo azione, recuperando id dell'annotazione nella lista tramite attributo data-id
						ann.attr("onclick","viewAnnotationDetails(\"" + ann.attr('data-id') + "\")");
						//Verifico se annotazione deve essere resa multipla
						addMultipleAnnotation(ann);
					}
				}
				//Altrimenti analizzo solo tipi di annotazione Frammento filtrati
				else{
					if($("#filtri-frammento label[fragment-type=" + annType + "]").not(".hasFiltro").length){
						ann.removeClass("hasFiltro");
						ann.attr("onclick","viewAnnotationDetails(\""+ann.attr('data-id')+"\")");
						addMultipleAnnotation(ann);
					}
				}
			}
			//Analizzo quali filtri documento nascosti devo mostrare, in base alla data
			var liDocumentInfo = $("#document-annotation-list li").filter(":hidden");
			for (var i = 0; i < liDocumentInfo.length; i++){
				var liAnnotation = $(liDocumentInfo[i]);
				var liType = liAnnotation.attr("data-type");
				if($('#check-date-filter').is(':checked')){
					var date = $('#date-setter').val();
					var dateAnn = liAnnotation.attr("data-time").substring(0,10);
					if(dateAnn >= date && $("#filtri-documento label[annotation-type=" + liType + "]").hasClass("attiva")){
						liAnnotation.show();
					}
				}
				else{
					if($("#filtri-documento label[annotation-type=" + liType + "]").hasClass("attiva")){
						liAnnotation.show();
					}
				}
			}
		}
		//Altrimenti è stato selezionato un autore
		else {
			var autoreSelezionato = $("#select-autore-annotazione option:selected").text();
			//Analizzo tutti i frammenti per mantenere solo quelli dell'autore selezionato
			var listaAnnCaricate = $("span[class^=annotation]");
			for(var i = 0; i < listaAnnCaricate.length; i++){
				var ann = $(listaAnnCaricate[i]);
				var autore = ann.attr("data-author");
				//Se l'autore è diverso allora filtro annotazione
				if (autore !== autoreSelezionato){
					ann.addClass("hasFiltro");
					//Rimuovo azione per non mostrare modale sul click
					ann.removeAttr("onclick");
					//Rimuovo eventuali annotazioni multiple
					removeMultipleAnnotation(ann);
				}
				//Se autore corrisponde
				else{
					var annType = ann.attr("data-type");
					//Verifico che data e tipo non siano filtrati
					if($('#check-date-filter').is(':checked')){
						var date = $('#date-setter').val();
						var dateAnn = ann.attr("data-time").substring(0, 10);
						if(dateAnn >= date && $("#filtri-frammento label[fragment-type=" + annType + "]").not(".hasFiltro").length){
							ann.removeClass("hasFiltro");
							ann.attr("onclick","viewAnnotationDetails(\"" + ann.attr('data-id') + "\")");
							addMultipleAnnotation(ann);
						}
					} else {
						if($("#filtri-frammento label[fragment-type=" + annType + "]").not(".hasFiltro").length){
							ann.removeClass("hasFiltro");
							ann.attr("onclick","viewAnnotationDetails(\""+ann.attr('data-id')+"\")");
							addMultipleAnnotation(ann);
						}
					}
				}
			}
			//Analizzo tutte le annotazioni Documento
			var liDocumentInfo = $("#document-annotation-list li");
			for (var i = 0; i < liDocumentInfo.length; i++){
				var liAnnotation = $(liDocumentInfo[i]);
				var liAuthor = liAnnotation.attr("data-author");
				if(liAuthor !== autoreSelezionato){
					liAnnotation.hide();
				}
				else{
					var liType = liAnnotation.attr("data-type");
					if($('#check-date-filter').is(':checked')){
						var date = $('#date-setter').val();
						var dateAnn = liAnnotation.attr("data-time").substring(0, 10);
						if(dateAnn >= date && $("#filtri-documento label[annotation-type=" + liType + "]").hasClass("attiva")){
							liAnnotation.show();
						}
					}
					else{
						if($("#filtri-documento label[annotation-type=" + liType + "]").hasClass("attiva")){
							liAnnotation.show();
						}
					}
				}
			}
		}
	});
}

/*
	Filtra le annotazioni Frammento in base al tipo
	@param _idElemento: id dell'elemento
	@param _clazz: classe da aggiungere/rimuovere
*/
function changeFragmentClass(_idElemento, _clazz){
	if(!$('#'+_idElemento).hasClass("hasFiltro")){
		var allSpan = $("span[data-type*=" + _clazz + "]").not(".hasFiltro");
		if(allSpan.length != 0){
			$('#'+_idElemento).addClass("hasFiltro");
			for(var i = 0; i < allSpan.length; i++){
				var ann = $(allSpan[i]);
				ann.addClass("hasFiltro");
				ann.removeAttr("onclick");
				removeMultipleAnnotation(ann);
			}
			$('#'+_idElemento).addClass("hasFiltro");
		}
	}
	else {
		var allSpan = $("span[data-type*=" + _clazz + "]").filter(".hasFiltro");
		for(var i = 0; i < allSpan.length; i++){
			$('#'+_idElemento).removeClass("hasFiltro");
			var ann = $(allSpan[i]);
			if($("#select-autore-annotazione").val() != "default" && $('#check-date-filter').is(':checked')){
				var autoreSelect = $("#select-autore-annotazione option:selected").text();
				var autoreSpan = ann.attr("data-author");
				var date = $('#date-setter').val();
				var spanDate = ann.attr("data-time").substring(0,10);
				if(autoreSpan === autoreSelect && spanDate >= date){
					ann.removeClass("hasFiltro");
					ann.attr("onclick","viewAnnotationDetails(\""+ann.attr('data-id')+"\")");
					addMultipleAnnotation(ann);
				}
			}
			else if($("#select-autore-annotazione").val() != "default"){
				var autoreSelect = $("#select-autore-annotazione option:selected").text();
				var autoreSpan = ann.attr("data-author");
				if(autoreSpan === autoreSelect){
					ann.removeClass("hasFiltro");
					ann.attr("onclick","viewAnnotationDetails(\""+ann.attr('data-id')+"\")");
					addMultipleAnnotation(ann);
				}
			}
			else if($('#check-date-filter').is(':checked')){
				var date = $('#date-setter').val();
				var spanDate = ann.attr("data-time").substring(0,10);
				if(spanDate >= date){
					ann.removeClass("hasFiltro");
					ann.attr("onclick","viewAnnotationDetails(\""+ann.attr('data-id')+"\")");
					addMultipleAnnotation(ann);
				}
			}
			else{
				ann.removeClass("hasFiltro");
				ann.attr("onclick","viewAnnotationDetails(\""+ann.attr('data-id')+"\")");
				addMultipleAnnotation(ann);
			}
		}
	}
}

/*
	Filtra le annotazione per data di inserimento
*/
function filterByDate(){
	//Se filtro è attivo
	if($('#check-date-filter').is(':checked')){
		var regularDate = /^[0-9]{4}\-[0-9]{2}\-[0-9]{2}$/;
		//Estraggo data inserita
		var date = $('#date-setter').val();
		//Verifico correttezza della data
		if(!regularDate.test(date)){
			alert("Il formato inserito non è corretto!");
			$('#check-date-filter').removeAttr('checked');
		}
		else{
			var year = parseInt(date.substr(0,4), 10);
			var month = parseInt(date.substr(5,7), 10);
			var day = parseInt(date.substr(8,10), 10);
			var tempDate = new Date(year, month-1, day);
			//Se formato aaaa-mm-gg non è rispettato
			if(tempDate.getFullYear() != year || tempDate.getMonth()+1 != month || tempDate.getDate() != day){
				alert("La data inserita non è corretta!");
				$('#check-date-filter').removeAttr('checked');
			}
			//Altrimenti posso filtrare
			else{
				//Disattivo possibilità di cambiare data, prima di aver disattivato il filtro
				$('#date-setter').datepicker('disable');
				//Filtro solamente le annotazioni Frammento attive
				var listaAnnCaricate = $("span[class^=annotation]").not(".hasFiltro");
				for(var i = 0; i < listaAnnCaricate.length; i++){
					var ann = $(listaAnnCaricate[i]);
					var dataAnn = ann.attr("data-time").substring(0,10);
					//Se la data dell'annotazione è < di quella scelta devo filtrare
					if (dataAnn < date){
						ann.addClass("hasFiltro");
						ann.removeAttr("onclick");
						removeMultipleAnnotation(ann);
					}
				}
				//Disattivo annotazioni relative al documento, analizzando solo quelle visibili
				var liDocumentInfo = $("#document-annotation-list li").not(":hidden");
				for (var i = 0; i < liDocumentInfo.length; i++){
					var liAnnotation = $(liDocumentInfo[i]);
					var liDate = liAnnotation.attr("data-time").substring(0,10);
					if(liDate < date){
						liAnnotation.hide();
					}
				}
			}
		}
	}
	//Altrimenti filtro data è stato rimosso
	else{
		//Analizzo le annotazioni su frammento non visibili (che hanno un filtro applicato)
		var listaAnnCaricate = $("span[class^=annotation]").filter(".hasFiltro");
		for(var i = 0; i < listaAnnCaricate.length; i++){
			var ann = $(listaAnnCaricate[i]);
			var annType = ann.attr("data-type");
			//Se esiste una selezione per autore
			if($("#select-autore-annotazione").val()!="default"){
				var autoreSelect = $("#select-autore-annotazione option:selected").text();
				var autoreAnn = ann.attr("data-author");
				//Se l'autore selezionato corrisponde a quello dell'annotazione e il filtro frammento relativo al tipo non è cliccato
				if(autoreAnn === autoreSelect && $("#filtri-frammento label[fragment-type=" + annType + "]").not(".hasFiltro").length){
					ann.removeClass("hasFiltro");
					ann.attr("onclick","viewAnnotationDetails(\""+ann.attr('data-id')+"\")");
					addMultipleAnnotation(ann);
				}
			}
			//Se non esiste filtro per autore, analizzo solo filtro frammento relativo
			else{
				if($("#filtri-frammento label[fragment-type=" + annType + "]").not(".hasFiltro").length){
					ann.removeClass("hasFiltro");
					ann.attr("onclick","viewAnnotationDetails(\""+ann.attr('data-id')+"\")");
					addMultipleAnnotation(ann);
				}
			}
		}
		//Analizzo annotazioni documento che sono nascoste
		var liDocumentInfo = $("#document-annotation-list li").filter(":hidden");
		for (var i = 0; i < liDocumentInfo.length; i++){
			var liAnnotation = $(liDocumentInfo[i]);
			var liType = liAnnotation.attr("data-type");
			if($("#select-autore-annotazione").val()!="default"){
				var autoreSelect = $("#select-autore-annotazione option:selected").text();
				var autoreAnn = liAnnotation.attr("data-author");
				//Se l'autore selezionato corrisponde a quello dell'annotazione e il filtro documento relativo al tipo non è cliccato
				if(autoreAnn === autoreSelect && $("#filtri-documento label[annotation-type=" + liType + "]").hasClass("attiva")){
					liAnnotation.show();
				}
			}
			//Se non esiste filtro per autore, analizzo solo filtro documento relativo
			else{
				if($("#filtri-documento label[annotation-type=" + liType + "]").hasClass("attiva")){
					liAnnotation.show();
				}
			}
		}
		//Riattivo possibilità di selezionare
		$('#date-setter').datepicker('enable');
	}
}

/*
	Gestisce l'aggiunta dello stile CSS per annotazioni multiple una volta che viene eliminato il filtraggio
	@param annotation: annotazione da controllare
*/
function addMultipleAnnotation (annotation){
	var controllo = false;
	//Ottengo sotto-annotazioni
	var child = annotation.find("[annot-mult='true']");
	//Se sono più di una
	if(child.length > 0){
		for(var i = 0; i < child.length; i++){
			//Se non è filtrata aggiungo classe
			if(!$(child[i]).hasClass("hasFiltro")){
				$(child[i]).addClass("annot_multiple");
				//Alla prima annotazione valida aggiorno variabile booleana
				controllo = true;
			}
		}
		//Se ho trovato sotto-annotazioni attive, aggiungo classe anche a quella ricevuta come parametro
		if(controllo){
			annotation.addClass("annot_multiple");
		}
	}
	controllo = false;
	//Ottengo annotazioni padre
	var parent = annotation.parents("[annot-mult='true']");
	if(parent.length > 0){
		for(var i = 0; i < parent.length; i++){
			if(!$(parent[i]).hasClass("hasFiltro")){
				controllo = true;
				//Dell'annotazione padre che sto analizzando verifico anche le sotto-annotazioni (gestione di casi particolari)
				child = $(parent[i]).find("[annot-mult='true']");
				var controlloFigli = false;
				for(var j = 0; j < child.length; j++){
					//Se figlio è filtrato, termino ciclo
					if($(child[j]).hasClass("hasFiltro")){
						controlloFigli = true;
						j = child.length;
					}
				}
				//Se non ho trovato figli che siano filtrati, aggiungo classe
				if(!controlloFigli){
					$(parent[i]).addClass("annot_multiple");
				}
			}
			//Se ho trovato annotazioni padre attive, aggiungo classe anche a quella ricevuta come parametro
			if(controllo){
				annotation.addClass("annot_multiple");
			}
		}
	}
}

/*
	Verifica se rimuovere annotazione multipla al momento del filtraggio
	@param annotation: annotazione da controllare
*/
function removeMultipleAnnotation (annotation){
	//Se annotazione ha sotto-annotazioni
	if(annotation.find(".annot_multiple").length > 0){
		annotation.find(".annotation").removeClass("annot_multiple");
	}
	/*Elimino la classe per le annotazioni multiple anche dall'elemento immediatamente precedente, solo se annotazione
		ha un solo padre*/
	if(annotation.parents(".annot_multiple").length === 1){
		annotation.parent(".annotation").removeClass("annot_multiple");
	}
	annotation.removeClass("annot_multiple");
}
