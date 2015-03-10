// Gestisce inserimenti delle annotazioni su fuseki e il caricamento dei documenti

var docs = '//annotaria.web.cs.unibo.it/documents/'; //URL della lista dei documenti
var listaAnnotazioni = {};
var rangySelection, rangeObject, selection, mail, username, annotationType, docSelected, isAnnDocumento = 0;
var selectedText = "";
var documentSelected = false;
var mode; // 1 = Annotatore
var annotazioniTemp = []; //Memoria annotazioni temporanee non ancora salvate
var risultati = []; //Risultati DBPedia
var modificaAnn = 0; //Gestisce lo stato di modifica annotazione
var annToMod; //Id dell'annotazione da modificare
var idClicked;

/*
   Carica tutti i documenti disponibili
*/
function caricaElencoDocumenti() {
    $.ajax({
        method: 'GET',
        url: docs,
        success: function(d){
            //Trovo tutti i link
            var vet = $(d).find('a'), str = '_ver1.html';
            for (var i=0; i<vet.length; i++) {
                //Prelevo dall'attributo href il link
                var link = $(vet[i]).attr('href');
                //Se ha un nome consistente senza estensione
                if (link.indexOf(str, link.length - str.length) !== -1) {
                    //Elimino dal nome stringa _ver1.html
                    var label = link.substr(0, link.length - str.length);
                    //Inserisco link al documento nel pannello "Elenco Documenti"
                    $('#listaDocumenti').append("<li><a id=\"idLink"+i+"\" href='#' onclick='loaddoc(\""+link+"\" , \""+label+"\" , \"doc"+i+"\", \"idLink"+i+"\")' 					title=\""+label+"\">" + label + "</a></li>");
                    //Aggiungo documento a select presente in modale per inserimento annotazione di tipo Citazione
                    var option = "<option value='"+label+"_ver1'>"+label+"</option>";
                    $("#documentList").append(option);
                }
            }
        },
        error: function(a,b,c) {
            alert('Error : caricamento lista documenti non riuscito');
        }
    });
}

/*
   Carica il documento selezionato dall'utente
   @param file: url del documento
   @param name: nome del documento
   @param id: identificativo del documento della forma [doc+n-esimo documento] esempio : primo documento -> id = doc0
   @idLink link nel pannello documenti
*/
function loaddoc(file, name, id, idLink){
    docSelected = name+"_ver1";
    if($('[href="#'+id+'"]').length == 0) {//se non ho mai caricato il documento
        $.when(load(file,name,id)).done(function(resparg){//carico tutto il documento
            $($('[href="#'+id+'"]')[0]).trigger('click');//triggero l'event click sul link
        });
    }
    else {//il doc e' stato caricato in precedenza lo carico
        $($('[href="#'+id+'"]')[0]).trigger('click');
    }
    if(idClicked != null){
        $("#"+idClicked).removeClass('activeLink');
    }
    documentSelected = true;
    $("#"+idLink).addClass('activeLink');
    idClicked = idLink;
    selectAnnotazioniDocumento(file);
    resetFilters();
}

/*
   Esegue una richiesta ajax per caricare il documento passato come parametro "file".
   I parametri hanno lo stesso significato della funzione loaddoc.
*/
function load(file, name, id)
{
    return $.ajax(
            {
                method: 'GET',
                url: docs+file,
                success: function(d)
                {
                    var imgs;
                    //Elimino tutto il contenuto del div
                    $('#file').html('');
                    $('#file').append('<div id="'+id+'" ></div>')
                        //Prendo tutto il contenuto html
                        $('#'+id).html(d);
                    imgs = $('#'+id+' img');
                    for (var i=0; i<imgs.length; i++)
                    {
                        //Salvo il path delle immagini
                        var src = $(imgs[i]).attr('src');
                        //Concateno all'URL
                        $(imgs[i]).attr('src', docs+src);
                    }
                },
                error: function(a,b,c) {
                    alert('Errore nel caricamento del documento '+file);
                }
            });
};

/*
   Resetta tutti i filtri al cambio di documento
*/
function resetFilters(){
    //Riattivo tutti i pulsanti per filtri Frammento
    var bottoniFiltroFrammenti = $('#filtri-frammento label');
    for (var i = 0; i < bottoniFiltroFrammenti.length; i++) {
        var bottone = $(bottoniFiltroFrammenti[i]);
        if(bottone.hasClass("hasFiltro")){
            bottone.removeClass("hasFiltro");
        }
    }
    //Riattivo tutti i pulsanti per filtri Documento
    var bottoniFiltroDocumento = $('#filtri-documento label');
    for (var i = 0; i < bottoniFiltroDocumento.length; i++) {
        var bottone = $(bottoniFiltroDocumento[i]);
        if(!bottone.hasClass('attiva')){
            bottone.addClass('attiva');
        }
    }
    //Resetto select per filtro autore
    $('#select-autore-annotazione').val('default');
    //Resetto componente Bootstrap per filtro data
    $('#date-setter').datepicker('enable');
    $('#date-setter').datepicker('setDate', '');
    $('#check-date-filter').removeAttr('disabled checked');
}

/*
   Setta i bordi del testo selezionato tramite rangy
*/
function setTextBorderSelected(){
    $('#file').mouseup(function (e){
        if(mode === 1){//modalità annotatore
            selectedText = getSelectedText();
            rangeObject = selection.getRangeAt(0);
            if(!rangeObject){
                rangeObject = document.createRange();
                rangeObject.setStart(selection.anchorNode, selection.anchorOffset);
                rangeObject.setEnd(selection.focusNode, selection.focusOffset);
            }
            if(rangeObject && (rangeObject.collapsed == false)){
                rangySelection = rangy.getSelection();
            }
        }
    });
}

/*
   Prende il testo selezionato per poi crearne l'annotazione temporanea sul frammento
*/
function getSelectedText(){
    var text="";
    if (window.getSelection) {// se e' stato selezionato qualcosa
        text = window.getSelection().toString();
        selection = window.getSelection();
    }
    else if (document.selection && document.selection.type != "Control") {// se ho la selezione ed e' del testo
        text = document.selection.createRange().text;//mi salvo il testo selezionato
        selection = document.selection.createRange(); //creo il range
    }
    return text;
}

/*
   Gestisce passaggio da modalità lettura a modalità Annotatore
*/
function startAnnotatorMode(){
    $('#modAnnotatore').click(function(){
        //Se non è stato selezionato alcun documento
        if(!documentSelected){
            alert("Per passare in modalità annotatore prima seleziona un documento!");
            $("#modAnnotatore").blur();
        }
        //Altrimenti mostro modale per login
        else{
            $('#annotatore').modal("show");
        }
    });
}

/*
   Gestisce il login, controllando le informazioni inserite e cambiando la modalità
*/
function setLoginParameter(){
    $("#btnSubmit").click(function(){
        try {
            //Validità username
            if($('#login_name').val().length > 0){
                username = $('#login_name').val();
            }
            else {
                throw "Inserire il nome!";
            }
            //Validità e-mail
            if($('#login_email').val().length > 0){
                var regexEmail = /\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/;
                var email = $('#login_email').val();
                if (regexEmail.test(email)) {
                    mail = email;
                }
                else {
                    throw "Indirizzo mail non valido!";
                }
            }
            else {
                throw "Inserire l'indirizzo mail!";
            }
            //Mostro username annotatore autenticato
            $('#modAnnotatore').html("Annotatore: <u>"+username+"</u>");
            //Passo in modalità annotatore
            mode = 1;
            //Attivo pulsanti modalità annotatore
            $('#gestioneAnnotazioni').attr("style", "display: inline");
            $('#modAnnotatore').addClass("annotator-mode");
            $("#annotatore").modal("hide");
        }
        catch(err){
            alert(err);
            $('#login_name').val() = '';
            $('#login_email').val() = '';
        }

    });
}

/*
   Gestione uscita da modalità Annotatore
*/
function exitAnnotatorMode() {
    $('#noAnnotatore').click(function(){
        //Elimino username Annotatore
        $('#modAnnotatore').html("Annotatore");
        //Riporto a modalità lettura
        mode = 0;
        selectedText = "";
        //Rimuovo pulsanti modalità Annotatore
        $('#gestioneAnnotazioni').attr("style", "display: none");
        $('#modAnnotatore').removeClass("annotator-mode");
        //Elimino tutte le annotazioni temporanee non salvate
        eliminaAnnotazioniTemp();
    });
}

/*
   Crea annotazione temporanea di tipo Documento
*/
function annotaDocumento(){
    //Click su pulsante "Annota Documento"
    $("#btn_annotDocumento").click(function(){
        //Voglio creare annotazione e non modificarla
        modificaAnn = 0;
        //Si tratta di annotazione Documento
        isAnnDocumento = 1;
        $('#bt_avanti_ann_doc').attr("disabled", "disabled");
        $('#modal_ann_doc').modal('show');
    });

    //Scelta di un tipo di annotazione Documento
    $("#body_modal_ann_doc label").click(function() {
        $('#bt_avanti_ann_doc').removeAttr("disabled");
        //Setto tipo di annotazione scelto
        annotationType = $(this).attr("annotation-type");
        var tipiAnnot = $("#body_modal_ann_doc label");
        //Rendo attivi i pulsanti tranne quello del tipo scelto
        for(var i = 0; i < tipiAnnot.length; i++){
            $(tipiAnnot[i]).addClass("attiva");
        }
        $(this).removeClass("attiva");
    });

    //Click su pulsante "Avanti"
    $('#bt_avanti_ann_doc').click(function(){
        $('#modal_ann_doc').modal("hide");
        //In base a tipo annotazione
        switch(annotationType){
            case "hasAuthor" :
                //Se annotazione prevede scelta tra valori già inseriti
                riempiSelect();
                //Se annotazione prevede anche inserimento di valore nuovo
                abilitaAreaTesto();
                //Abilito widget corrispondente
                attivaWidget("instance-widget");
                //Mostro modale per inserimento informazioni annotazione
                $('#step2').modal('show');
                //Setto titolo modale
                $('#step2 .modal-title').text('Annota documento - Autore');
                break;
            case "hasPublicationYear":
                attivaWidget("date-widget");
                $('#step2').modal('show');
                $('#step2 .modal-title').text('Annota documento - Pubblicazione');
                break;
            case "hasPublisher":
                riempiSelect();
                abilitaAreaTesto();
                attivaWidget("instance-widget");
                $('#step2').modal('show');
                $('#step2 .modal-title').text('Annota documento - Editore');
                break;
            case "hasTitle":
                attivaWidget("shortText-widget");
                $('#step2').modal('show');
                $('#step2 .modal-title').text('Annota documento - Titolo');
                break;
            case "hasAbstract":
                attivaWidget("longText-widget");
                $('#step2').modal('show');
                $('#step2 .modal-title').text('Annota documento - Riassunto');
                break;
            case "hasComment":
                attivaWidget("longText-widget");
                $('#step2').modal('show');
                $('#step2 .modal-title').text('Annota documento - Commento');
                break;
            case "hasShortTitle":
                attivaWidget("shortText-widget");
                $('#step2').modal('show');
                $('#step2 .modal-title').text('Annota documento - Titolo breve');
                break;
        }
    });
}

/*
   Crea annotazione temporanea di tipo Frammento
*/
function annotaFrammento(){
    //Click su pulsante "Annota Frammento"
    $("#btn_annotFrammento").click(function(){
        modificaAnn = 0;
        //Se non è stato selezionato nessun frammento di testo
        if(selectedText == "" || selectedText == null){
            alert("Seleziona il testo da annotare!");
            $('#btn_annotFrammento').blur();
        }
        else {
            //Si tratta di annotazione Frammento
            isAnnDocumento = 0;
            $('#bt_avanti_ann_fram').attr("disabled", "disabled");
            $('#modal_ann_fram').modal('show');
        }
    });

    //Scelta di un tipo di annotazione Frammento
    $(".tipi-annot label").click(function() {
        $('#bt_avanti_ann_fram').removeAttr("disabled");
        annotationType = $(this).attr("fragment-type");
        var tipiAnnot = $(".tipi-annot label");
        for(var i = 0; i < tipiAnnot.length; i++){
            $(tipiAnnot[i]).removeClass("hasFiltro");
        }
        $(this).addClass("hasFiltro");
    });

    //Click su pulsante "Avanti"
    $('#bt_avanti_ann_fram').click(function(){
        $('#modal_ann_fram').modal("hide");
        switch(annotationType){
            case "denotesPerson":
                riempiSelect();
                abilitaAreaTesto();
                attivaWidget("instance-widget");
                $('#step2 .modal-title').text('Annota frammento - Persona');
                $('#step2').modal('show');
                break;
            case "denotesPlace":
                riempiSelect();
                abilitaAreaTesto();
                attivaWidget("instance-widget");
                $('#step2 .modal-title').text('Annota frammento - Luogo');
                //Svuoto eventuali risultati precedenti
                $("#resourcePlaceDiv").empty();
                $('#step2').modal('show');
                break;
            case "denotesDisease":
                riempiSelect();
                abilitaAreaTesto();
                attivaWidget("instance-widget");
                $('#step2 .modal-title').text('Annota frammento - Malattia');
                $('#step2').modal('show');
                break;
            case "hasSubject":
                riempiSelect();
                abilitaAreaTesto();
                attivaWidget("instance-widget");
                $('#step2 .modal-title').text('Annota frammento - Argomento');
                $('#step2').modal('show');
                break;
            case "relatesTo":
                attivaWidget('dbpedia-widget');
                $('#step2 .modal-title').text('Annota frammento - DBPedia');
                $("#resourceDiv").empty();
                $('#step2').modal('show');
                break;
            case "hasClarityScore":
                attivaWidget("choice-widget");
                //Setto titolo della select
                setTitoloChoiceWidget();
                $('#step2 .modal-title').text('Annota frammento - Chiarezza');
                $('#step2').modal('show');
                break;
            case "hasOriginalityScore":
                attivaWidget("choice-widget");
                setTitoloChoiceWidget();
                $('#step2 .modal-title').text('Annota frammento - Giudizio');
                $('#step2').modal('show');
                break;
            case "hasFormattingScore":
                attivaWidget("choice-widget");
                setTitoloChoiceWidget();
                $('#step2 .modal-title').text('Annota frammento - Presentazione');
                $('#step2').modal('show');
                break;
            case "cites":
                attivaWidget("citation-widget");
                $('#step2 .modal-title').text('Annota frammento - Citazione');
                $('#step2').modal('show');
                break;
            case "hasComment":
                attivaWidget("longText-widget");
                $('#step2 .modal-title').text('Annota frammento - Commento');
                $('#step2').modal('show');
                break;
        }
    });
}

/*
   Abilita le aree di testo presenti nei widget di creazione delle annotazioni
*/
function abilitaAreaTesto(){
    var content = $("#textArea");
    //Nascondo tutte le aree di testo per poi mostrare solo quella desiderata
    var child = content.find("div");
    if(child.length > 0){
        for(var i = 0; i < child.length; i++){
            $(child[i]).css("display", "none");
        }
    }
    switch(annotationType){
        case "denotesPerson":
            $("#instance-person").css("display", "block");
            break;
        case "denotesPlace":
            var content = $("#instance-place");
            //Attivo elementi per ricerca Luogo su DBPedia
            var child = content.find("div");
            if(child.length > 0){
                for(var i = 0; i < child.length; i++){
                    $(child[i]).css("display", "visible");
                }
            }
            $("#instance-place").css("display", "block");
            break;
        case "denotesDisease":
            $("#instance-disease").css("display", "block");
            break;
        case "hasSubject":
            $("#instance-argument").css("display", "block");
            break;
        case "hasAuthor":
            $("#instance-author").css("display", "block");
            break;
        case "hasPublisher":
            $("#instance-publisher").css("display", "block");
            break;
    }
}

/*
   Setta il titolo da mostrare sopra le diverse select
*/
function setTitoloChoiceWidget(){
    switch(annotationType){
        case "hasClarityScore":
            $("#choice-title").text("Seleziona un livello di chiarezza");
            break;
        case "hasOriginalityScore":
            $("#choice-title").text("Seleziona un livello di originalità");
            break;
        case "hasFormattingScore":
            $("#choice-title").text("Seleziona un livello di presentazione");
            break;
    }
}

/*
   Attiva widget corrispondente al tipo di annotazione selezionato
   @param widgetType: tipo di widget da attivare
*/
function attivaWidget(widgetType){
    //Se sto creando annotazione non devo mostrare valore precedente
    if(modificaAnn == 0){
        $("#valorePrec").css("display", "none");
    }
    //Altrimenti mostro il valore che si sta modificando
    else{
        $("#valorePrec").css("display", "block");
    }
    var widget = $(".modal-body div[id*=widget]");
    //Disattivo widget precedentemente attivi e mostro quello desiderato
    for(var i = 0; i < widget.length;i++ ){
        if($(widget[i]).attr("id") == widgetType){
            $(widget[i]).css("display","block");
        }
        else {
            $(widget[i]).css("display","none");
        }
        //Azzero eventuali valori inseriti
        $(widget[i]).find("input").val('');
        $(widget[i]).find("textarea").val('');
    }
}

/*
   Imposta i valori all'interno delle select nei vari widget
*/
function riempiSelect(){
    var myquery = prefix;
    switch(annotationType){
        //In questo caso la query prende solo gli autori dei documenti (non gli autori delle annotazioni)
        case"hasAuthor":
            myquery += "\SELECT DISTINCT ?nome ?uri\
                        WHERE {\
                            ?uri a foaf:Person;\
                                foaf:name ?nome.\
                                ?x rdfs:label ?nome.\
                        }\
            ORDER BY (?nome)";
            break;
        case"hasPublisher":
            myquery += "\SELECT DISTINCT ?nome ?uri  ?home\
                        WHERE {\
                            ?uri a foaf:Organization;\
                                foaf:name ?nome.\
                                OPTIONAL {?uri foaf:homepage ?home}\
                        }\
            ORDER BY (?nome)";
            break;
            //In questo caso la query prende tutte le persone salvate sul triple store (autori dei documenti e autori delle annotazioni)
        case"denotesPerson":
            myquery += "\SELECT DISTINCT ?nome ?uri\
                        WHERE {\
                            ?uri a foaf:Person;\
                                foaf:name ?nome.\
                        }\
            ORDER BY (?nome)";
            break;
        case"denotesPlace":
            myquery += "\SELECT DISTINCT ?nome ?uri\
                        WHERE {\
                            ?uri a dbpedia:Place;\
                                rdfs:label ?nome.\
                        }\
            ORDER BY (?nome)";
            break;
        case"denotesDisease":
            myquery += "\SELECT DISTINCT ?nome ?uri\
                        WHERE {\
                            ?uri a skos:Concept ;\
                                rdfs:label ?nome.\
                                filter regex(str(?uri), \".*/disease/*.\")\
                        }\
            ORDER BY (?nome)";
            break;
        case"hasSubject":
            myquery += "\SELECT DISTINCT ?nome ?uri\
                        WHERE {\
                            ?uri a skos:Concept ;\
                                rdfs:label ?nome.\
                                filter regex(str(?uri), \".*bncf.\")\
                        }\
            ORDER BY (?nome)";
            break;
    }
    var encodedquery = encodeURIComponent(myquery);
    var queryUrl = endpointFusekiURL + "query?query=" + encodedquery + "&format=" + "json";
    //Popolo la drop-down list
    $.ajax({
        dataType: "jsonp",
        url: queryUrl,
        success: function(d) {
            $('#select_instance').empty();
            var risultato = d.results.bindings
                for(i in risultato){
                    var uri = risultato[i].uri.value;
                    var homepage = "";
                    if (risultato[i].hasOwnProperty("home")){
                        homepage = risultato[i].home.value;
                    }
                    var option = "<option value='"+risultato[i].nome.value+"' data-uri='"+uri+"' data-homep='"+homepage+"'>"+risultato[i].nome.value+"</option>";
                    $('#select_instance').append(option);
                }

        },
        error: function() {
            alert("Errore nel caricamento degli autori");
        }
    });
}

/*
   Gestisce il click sul bottone di ricerca du DBPedia
*/
function ricercaDBPedia(){
    $("#dbpedia-searchBtn").click(function(){
        var val = $("#ricercaDBPedia").val();
        searchValueFromDBPedia(val);
    });

    $("#dbpediaPlace-searchBtn").click(function(){
        var val = $("#ricercaDBPediaPlace").val();
        searchValueFromDBPedia(val);
    });
}

/*
   Trova corrispondenze su DBPedia per valore inserito
   @param valore: valore da ricercare
*/
function searchValueFromDBPedia(valore){
    var link;
    risultati = [];
    switch (annotationType){
        case "denotesPlace":
            var encodedVal = encodeURIComponent(valore);
            //URL per ricerca su DBPedia
            link = "http://lookup.dbpedia.org/api/search.asmx/KeywordSearch?QueryClass=place&QueryString="+encodedVal+"&MaxHits=50";
            $.ajax({
                url: link,
                dataType: "json",
                success: function(data){
                    //Elimino eventuale ricerca precedente
                    $("#resourcePlaceDiv").empty();
                    $("#resourcePlaceDiv").css("display", "block");
                    risultati = data.results;
                    //Se non vengono trovate corrispondenze
                    if(risultati.length < 1){
                        $("#resourcePlaceDiv").append("<p class='noResult'>Nessun risultato trovato</p>");
                    }
                    //Altrimenti mostro select con risultati
                    else{
                        $("#resourcePlaceDiv").append("<h4>Seleziona un luogo dalla lista</h4>");
                        $("#resourcePlaceDiv").append("<p>Risultati per <b>" + valore + "</b></p>");
                        $("#resourcePlaceDiv").append("<select id='risultatiDBPediaPlaceSelect' class='form-control'></select>");
                        $("#resourcePlaceDiv").append("<div id='descrizioneRisorsaPlace' class='well'></div>");
                        for(res in risultati){
                            $("#risultatiDBPediaPlaceSelect").append("<option value='"+risultati[res].uri+"'>"+risultati[res].label+"</option>");
                        }
                        //Mostro descrizione del risultato selezionato
                        $("#descrizioneRisorsaPlace").append("<span>"+risultati[0].description+"</span>");
                        //Al cambio del valore della select cambio descrizione risultato
                        $("#risultatiDBPediaPlaceSelect").change(function(){
                            $("#descrizioneRisorsaPlace").empty();
                            var val = $("#risultatiDBPediaPlaceSelect option:selected").text();
                            for(res in risultati){
                                if(risultati[res].label == val){
                                    $("#descrizioneRisorsaPlace").append("<span>"+risultati[res].description+"</span>");
                                }
                            }
                        });
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    alert("Errore nel caricamento dei risultati");
                }
            });
        	break;
        case "relatesTo":
            var encodedVal = encodeURIComponent(valore);
            link = "http://lookup.dbpedia.org/api/search.asmx/KeywordSearch?QueryString="+encodedVal+"&MaxHits=50";
            $.ajax({
                url: link,
                dataType: "json",
                success: function(data){
                    $("#resourceDiv").empty();
                    $("#resourceDiv").css("display", "block");
                    risultati = data.results;
                    if(risultati.length < 1){
                        $("#resourceDiv").append("<p class='noResult'>Nessun risultato trovato</p>");
                    }
                    else{
                        $("#resourceDiv").append("<h4>Seleziona un argomento dalla lista</h4>");
                        $("#resourceDiv").append("<p>Risultati per <b>" + valore + "</b></p>");
                        $("#resourceDiv").append("<select id='risultatiDBPediaSelect' class='form-control'></select>");
                        $("#resourceDiv").append("<div id='descrizioneRisorsa' class='well'></div>");
                        for(res in risultati){
                            $("#risultatiDBPediaSelect").append("<option value='"+risultati[res].uri+"'>"+risultati[res].label+"</option>");
                        }
                        $("#descrizioneRisorsa").append("<span>"+risultati[0].description+"</span>");
                        $("#risultatiDBPediaSelect").change(function(){
                            $("#descrizioneRisorsa").empty();
                            var val = $("#risultatiDBPediaSelect option:selected").text();
                            for(res in risultati){
                                if(risultati[res].label == val){
                                    $("#descrizioneRisorsa").append("<span>"+risultati[res].description+"</span>");
                                }
                            }
                        });
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    alert("Errore nel caricamento dei risultati");
                }
            });
            break;
    }
}

/*
   Gestisce l'inserimento della data per annotazione di tipo Pubblicazione, non permettendo l'inserimento
   di caratteri diversi da numeri
*/
function inserimentoData(){
    $("#date-widget-text").keydown(function (e) {
        //Consente CTRL+A , home , sinistra e destra
        if (e.keyCode == 8 ||(e.keyCode == 65 && e.ctrlKey === true) || (e.keyCode >= 35 && e.keyCode <= 39)) {
            return;
        }
        //Verifica che l'input sia un numero
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    });
}

/*
   Gestisce la chiusura delle modali di selezione tipo annotazione
*/
function gestisciChiusuraModali(){
    //Su chiusura della modale per annotazioni Documento
    $('#modal_ann_doc').on('hidden.bs.modal', function () {
        var tipiAnnot = $("#body_modal_ann_doc label");
        //Riattiva tutti i pulsanti
        for(var i = 0; i < tipiAnnot.length; i++){
            $(tipiAnnot[i]).addClass("attiva");
        }
    });

    //Su chiusura della modale per annotazioni Frammento
    $('#modal_ann_fram').on('hidden.bs.modal', function () {
        var tipiAnnot = $(".tipi-annot label");
        for(var i = 0; i < tipiAnnot.length; i++){
            $(tipiAnnot[i]).removeClass("hasFiltro");
        }
    });
}

/*
   Gestisce il click su pulsante "Conferma" in caso di inserimento/modifica annotazione
*/
function confermaAnnotazione(){
    $("#btnConferma").click(function(){
        //Se sto creando annotazione
        if(modificaAnn == 0){
            creaAnnotazione();
        }
        //Altrimenti la sto modificando
        else{
            confermaModifica();
        }
    });
}

/*
   Crea l'annotazione temporanea e la salva in memoria
*/
function creaAnnotazione(){
    var date = new Date();
    var ann;
    var okToInsert = false;
    var ann_label, oggetto, ann_predicate, ann_type_label, homepage = "";
    if(isAnnDocumento){
        switch(annotationType){
            //Annotazioni documento
            case "hasAuthor":
                //L'autore e' stato inserito manualmente
                if($("#text-instance-author").val() != ""){
                    ann_label = $("#text-instance-author").val();
                    oggetto = "http://vitali.web.cs.unibo.it/AnnOtaria/person/"+ann_label.split(' ').join('-');
                }
                //L'autore e' stato scelto dalla lista
                else {
                    ann_label = $("#select_instance").find(":selected").text();
                    oggetto = $("#select_instance").find(":selected").attr("data-uri");
                }
                ann_predicate = "dcterms:creator";
                ann_type_label = "Autore";
                okToInsert = true;
                break;
            case "hasPublisher":
                if($("#text-instance-publisher").val() != ""){
                    ann_label = $("#text-instance-publisher").val();
                    oggetto = "http://vitali.web.cs.unibo.it/AnnOtaria/organization/"+ann_label.split(' ').join('-');
                }
                else{
                    ann_label = $("#select_instance").find(":selected").text();
                    oggetto = $("#select_instance").find(":selected").attr("data-uri");
                    homepage = $("#select_instance").find(":selected").attr("data-homep");
                }
                ann_predicate = "dcterms:publisher";
                ann_type_label = "Editore";
                okToInsert = true;
                break;
            case "hasPublicationYear":
                if($("#date-widget-text").val() == ""){
                    alert("Devi inserire un anno di pubblicazione");
                }
                else if($("#date-widget-text").val() > new Date().getFullYear()){
                    alert("Anno inserito successivo a quello corrente");
                }
                else if($("#date-widget-text").val() < $("#date-widget-text").attr("min")){
                    alert("Anno inserito inferiore al minimo possibile");
                }
                else{
                    ann_label = $("#date-widget-text").val();
                    ann_predicate = "fabio:hasPublicationYear"
                        oggetto = ann_label;
                    ann_type_label = "Pubblicazione";
                    okToInsert = true;
                }
                break;
            case "hasTitle":
                if($("#shortText-widget-text").val() == ""){
                    alert("Devi inserire un titolo");
                }
                else{
                    ann_label = $("#shortText-widget-text").val();
                    ann_predicate = "dcterms:title";
                    oggetto = ann_label;
                    ann_type_label = "Titolo";
                    okToInsert = true;
                }
                break;
            case "hasAbstract":
                if($("#longText-widget-text").val() == ""){
                    alert("Devi inserire un riassunto");
                }
                else{
                    ann_label = $("#longText-widget-text").val();
                    ann_predicate = "dcterms:abstract"
                        oggetto = ann_label;
                    ann_type_label = "Riassunto";
                    okToInsert = true;
                }
                break;
            case "hasShortTitle":
                if($("#shortText-widget-text").val() == ""){
                    alert("Devi inserire un titolo");
                }
                else{
                    ann_label = $("#shortText-widget-text").val();
                    oggetto = ann_label;
                    ann_predicate = "fabio:hasShortTitle";
                    ann_type_label = "Titolo breve";
                    okToInsert = true;
                }
                break;
            case "hasComment":
                if($("#longText-widget-text").val() == ""){
                    alert("Devi inserire un commento");
                }
                else{
                    ann_label = $("#longText-widget-text").val();
                    ann_predicate =  "schema:comment";
                    oggetto = ann_label;
                    ann_type_label = "Commento personale";
                    okToInsert = true;
                }
                break;
        }
        //Tutti i dati sono stati inseriti correttamente
        if(okToInsert == true){
            //Creo l'annotazione in formato json
            ann = {
                id: annotazioniTemp.length,
                annotazione: {
                    type: annotationType,
                    label: ann_type_label,
                    body: {
                        label: ann_label,
                        subject: "ao:"+docSelected,
                        predicate: ann_predicate,
                        object: oggetto
                    }
                },
                pos_annot: {
                    articolo:"ao:"+docSelected+".html"
                },
                origine: {
                    autore: {
                        name: username,
                        email: mail
                    },
                    time: date.toISOString()
                },
                hp: homepage
            }
        }
    }
    //Annotazioni Frammento
    else {
        //Div padre della selezione
        var container = rangeObject.commonAncestorContainer;
        /*Ciclo fino a che non trovo un nodo padre che abbia il campo id.
          Il nodo non deve essere uno span creato in precedenza per un'annotazione, ma deve essere un nodo presente nel testo originale*/
        while(!container.id || $("#"+container.id).hasClass("annotation")){
            container = container.parentNode;
        }
        var startOffset, endOffset;
        //Creo un oggetto range che contiene il nodo padre appena trovato
        var rangeCommon = document.createRange();
        rangeCommon.selectNodeContents(container);
        rangeCommon.setEnd(rangeObject.endContainer, rangeObject.endOffset);
        startOffset = rangeCommon.toString().length-(rangeObject.toString().length);
        endOffset = startOffset + rangeObject.toString().length;
        //Gestione in base a tipo annotazione
        var ann_label, oggetto, ann_predicate, ann_type_label;
        switch(annotationType){
            case "denotesPerson":
                if(($("#textPerson").val() != "")){
                    ann_label = $("#textPerson").val();
                    oggetto = "http://vitali.web.cs.unibo.it/AnnOtaria/person/"+ann_label.split(' ').join('-');
                }
                else{
                    ann_label = $("#select_instance").find(":selected").text();
                    oggetto = $("#select_instance").find(":selected").attr("data-uri");
                }
                ann_predicate = "sem:denotes";
                ann_type_label = "Persona";
                okToInsert = true;
                break;
            case "denotesPlace":
                //Se è stata eseguita ricerca di un luogo
                if($("#risultatiDBPediaPlaceSelect").find(":selected").text() != ""){
                    ann_label = $("#risultatiDBPediaPlaceSelect").find(":selected").text();
                    oggetto = $("#risultatiDBPediaPlaceSelect").find(":selected").val();
                }
                else{
                    ann_label = $("#select_instance").find(":selected").text();
                    oggetto = $("#select_instance").find(":selected").attr("data-uri");
                }
                ann_predicate = "sem:denotes";
                ann_type_label = "Luogo";
                okToInsert = true;
                break;
            case "denotesDisease":
                if($("#text-disease").val() != ""){
                    ann_label = $("#text-disease").val();
                    oggetto = "http://www.icd10data.com/ICD10CM/Codes/"+ann_label.split(' ').join('-');
                }
                else{
                    ann_label = $("#select_instance").find(":selected").text();
                    oggetto = $("#select_instance").find(":selected").attr("data-uri");
                }
                ann_predicate = "sem:denotes";
                ann_type_label = "Malattia";
                okToInsert = true;
                break;
            case "hasSubject":
                if($("#text-argument").val() != ""){
                    ann_label = $("#text-argument").val();
                    oggetto = "http://thes.bncf.firenze.sbn.it/"+ann_label.split(' ').join('-');
                }
                else{
                    ann_label = $("#select_instance").find(":selected").text();
                    oggetto = $("#select_instance").find(":selected").attr("data-uri");
                }
                ann_predicate = "fabio:hasSubjectTerm";
                ann_type_label = "Argomento principale";
                okToInsert = true;
                break;
            case "relatesTo":
                //Se è stata eseguita ricerca su DBPedia
                if(($('#risultatiDBPediaSelect').length)){
                    ann_label = $('#risultatiDBPediaSelect').find(":selected").text();
                    oggetto = $('#risultatiDBPediaSelect').find(":selected").val();
                    ann_predicate = "skos:related";
                    ann_type_label = "Risorsa DBPedia";
                    okToInsert = true;
                }
                else{
                    alert("Devi selezionare un valore da DBPedia!");
                }
                break;
            case "hasClarityScore":
                ann_label = $("#choice-list").find(":selected").text();
                oggetto = "http://vitali.web.cs.unibo.it/AnnOtaria/score/"+ann_label;
                ann_predicate = "ao:hasClaritiyScore";
                ann_type_label = "Chiarezza";
                okToInsert = true;
                break;
            case "hasOriginalityScore":
                ann_label = $("#choice-list").find(":selected").text();
                oggetto = "http://vitali.web.cs.unibo.it/AnnOtaria/score/"+ann_label;
                ann_predicate = "ao:hasOriginalityScore";
                ann_type_label = "Originalita' ";
                okToInsert = true;
                break;
            case "hasFormattingScore":
                ann_label = $("#choice-list").find(":selected").text();
                oggetto = "http://vitali.web.cs.unibo.it/AnnOtaria/score/"+ann_label;
                ann_predicate = "ao:hasFormattingScore";
                ann_type_label = "Presentazione";
                okToInsert = true;
                break;
            case "cites":
                var doc;
                if($("#citation-title-text").val() != "" && $("#citation-title-text").val() != "" ){
                    doc = $("#citation-title-text").val().split(' ').join('-');
                    ann_label = $("#citation-address-text").val();
                }
                else{
                    doc = $("#documentList").find(":selected").text();
                    ann_label = $("#documentList").find(":selected").val();
                }
                oggetto = "ao:"+doc;
                ann_predicate = "cito:cites";
                ann_type_label = "Citazione";
                okToInsert = true;
                break;
            case"hasComment":
                if($("#longText-widget-text").val() == ""){
                    alert("Devi inserire un commento");
                }
                else{
                    ann_label = $("#longText-widget-text").val();
                    ann_predicate = "schema:comment";
                    ann_type_label = "Commento personale";
                    oggetto = ann_label;
                    okToInsert = true;
                }
                break;
        }
        if(okToInsert == true){
            ann = {
                id: annotazioniTemp.length,
                annotazione: {
                    type: annotationType,
                    label: ann_type_label,
                    body: {
                        label: ann_label,
                        subject: "ao:"+docSelected+"#"+container.id+"-"+startOffset+"-"+endOffset,
                        predicate: ann_predicate,
                        object: oggetto
                    }
                },
                pos_annot:{
                    articolo:"ao:"+docSelected+".html",
                    id: container.id,
                    inizio_annotazione: startOffset,
                    fine_annotazione: endOffset
                },
                origine:{
                    autore: {
                        name: username,
                        email: mail
                    },
                    time: date.toISOString()
                },
                hp: homepage
            }
        }
    }
    //Inserisco annotazione in memoria
    annotazioniTemp.push(ann);
    //Mostro annotazione temporanea creata
    visualizzaAnnTemp(ann);
    $('#step2').modal("hide");
}

/*
   Visualizza le annotazioni temporanee create dall'utente, ma non ancora salvate
   @param ann: annotazione temporanea da visualizzare
*/
function visualizzaAnnTemp(ann){
    var id = ann.id ;
    var idQuotes ="\""+ "tmp" + ann.id + "\"";
    //Annotazione Frammento
    if(ann.pos_annot.hasOwnProperty("inizio_annotazione")){
        var nodo = $("#file #"+ann.pos_annot.id);
        var start = ann.pos_annot.inizio_annotazione;
        var end = ann.pos_annot.fine_annotazione;
        var nodo_children = [];
        if (nodo.length){
            nodo = $("#file #"+ann.pos_annot.id)[0];
            var range = rangy.createRange();
            range.selectNodeContents(nodo);
            nodo_children = range.getNodes([3]);
            var result = findStartEnd(nodo_children,start,end);
            var nodi_annotazione = result[0];
            var off_start = result[1];
            var off_end = result[2];
            //Non riutilizziamo metodo per annotazioni già memorizzate ma lo riprendiamo solo
            //createFragmentAnnotation(nodi_annotazione, off_start, off_end, ann);
            for (var i = 0; i < nodi_annotazione.length; i++) {
                var range = document.createRange();
                if (i === 0){
                    range.setStart(nodi_annotazione[i], off_start);
                }
                else{
                    range.setStartBefore(nodi_annotazione[i]);
                }
                if (i === nodi_annotazione.length-1){
                    range.setEnd(nodi_annotazione[i], off_end);
                }
                else{
                    range.setEndAfter(nodi_annotazione[i]);
                }
            }
            var span = document.createElement('span');
            span.setAttribute("class", "annotation " + ann.annotazione.type + "_attiva");
            span.setAttribute("onclick", "viewAnnotationDetails(" + idQuotes + ")");
            span.setAttribute("data-id", "tmp" + ann.id);
            span.setAttribute("data-author", ann.origine.autore.name);
            span.setAttribute("data-time", ann.origine.time);
            span.setAttribute("data-type", ann.annotazione.type);
            range.surroundContents(span);
            //Se filtro frammento corrispondente è cliccato nascondo annotazione ed elimino onclick
            if($("#filtri-frammento label[fragment-type=" + ann.annotazione.type +"]").hasClass('hasFiltro')){
                span.classList.add("hasFiltro");
                span.removeAttribute("onclick");
            }
            else if($("#select-autore-annotazione").val() != "default"){
                //Se autore selezionato è diverso nascondo annotazione
                if($("#select-autore-annotazione option:selected").text() != ann.origine.autore.name){
                    span.classList.add("hasFiltro");
                    span.removeAttribute("onclick");
                }
            }
            else if($('#check-date-filter').is(':checked')){
                //Se data inserita è maggiore di quella di inserimento nascondo annotazione
                if($('#date-setter').val() > ann.origine.time){
                    span.classList.add("hasFiltro");
                    span.removeAttribute("onclick");
                }
            }
            //Se annotazione creata ha un solo padre
            if($(span).parents(".annotation").length == 1){
                //Ad entrambe le annotazioni aggiungo attributo per identificare molteplicità
                $(span).attr("annot-mult", "true");
                $(span).parent(".annotation").attr("annot-mult", "true");
                //Se annotazione creata e padre non sono filtrati aggiungo classe per annotazione multipla
                if(!$(span).hasClass("hasFiltro") && !$(span).parent(".annotation").hasClass("hasFiltro")){
                    $(span).addClass("annot_multiple");
                    $(span).parent(".annotation").addClass("annot_multiple");
                }
            }
            //Se annotazione creata ha più di un padre
            else if($(span).parents(".annotation").length > 1){
                $(span).attr("annot-mult", "true");
                /*Se l'annotazione creata non viene filtrata percorro tutti i padri per trovarne almeno uno attivo
                  (non filtrato) e visualizzare annotazione multipla (se aggiungo annotazione quando tutti i padri
                  sono disattivati, questa non verrà mostrata come multipla)*/
                if(!$(span).hasClass("hasFiltro")){
                    var parents = $(span).parents(".annotation");
                    for(var i = 0; i < parents.length; i++){
                        if(!$(parents[i]).hasClass("hasFiltro")){
                            $(span).addClass("annot_multiple");
                            i = parents.length;
                        }
                    }
                }
            }
        }
    }
    else{
        var li = $('<li></li>');
        var span = $('<span></span>');
        span.text(ann.annotazione.body.label);
        span.attr('class', 'document-annotation-span');
        span.attr('onclick', 'viewAnnotationDetails(' + idQuotes + ')');
        li.attr('data-id', 'tmp'+id);
        li.attr('data-author', ann.origine.autore.name);
        li.attr('data-time', ann.origine.time);
        li.attr('data-type', ann.annotazione.type);
       	li.append(span);
        $('#' + ann.annotazione.type + '-list').append(li);
        //Se filtro documento corrispondente è cliccato nascondo annotazione
        if(!$("#filtri-documento label[annotation-type=" + ann.annotazione.type +"]").hasClass('attiva')){
           	li.hide();
        }
        else if($("#select-autore-annotazione").val() != "default"){
           	//Se autore selezionato è diverso nascondo annotazione
            if($("#select-autore-annotazione option:selected").text() != ann.origine.autore.name){
               	li.hide();
            }
        }
        else if($('#check-date-filter').is(':checked')){
            //Se data inserita è maggiore di quella di inserimento nascondo annotazione
            if($('#date-setter').val() > ann.origine.time){
               	li.hide();
            }
        }
    }
    var attributi = {
        autore: ann.origine.autore.name,
        email: ann.origine.autore.email,
        date: ann.origine.time,
        tipo: ann.annotazione.label,
        oggetto: ann.annotazione.body.label
    }
    createModal("tmp" + ann.id, attributi);
}

/*
   Gestisce apertura modale con tabella riassuntiva delle annotazioni temporanee, con possibilità di
   modificare, cancellare e salvare.
*/
function manageAnnotations(){
    $("#btn_annotManage").click(function(){
        //Se non ci sono annotazioni temporanee
        if(!annotazioniTemp.length){
            alert("Non sono presenti annotazioni da gestire!");
            $("#btn_annotManage").blur();
        }
        //Altrimenti carico tabella con tutte le informazioni
        else{
            $("#ann-table tbody").empty();
            for(var i = 0; i < annotazioniTemp.length; i++){
                var id_ann = annotazioniTemp[i].id;
                var num = id_ann+1;
                var documento = annotazioniTemp[i].pos_annot.articolo;
                var valore = annotazioniTemp[i].annotazione.body.label;
                var tipo = annotazioniTemp[i].annotazione.label;
                //Inserimento opzioni cancella e modifica
                var modifica = '<label class="btn btn-default" onclick="modificaAnnotazione(' + id_ann +')"><span class="glyphicon glyphicon-pencil" ></span></label>';
                var cancella = '<label class="btn btn-default" onclick="eliminaAnnotazione(' + id_ann +', ' + false + ')"><span class="glyphicon glyphicon-trash" ></span></label>';
                var riga = "<tr data-id='"+id_ann+"'><td>"+num+"</td><td id=documento>"+documento+"</td><td>"+tipo+"</td><td id=valore>"+valore+"</td><td>"+modifica+"</td><td>"+cancella+"</td></tr>";
                $("#ann-table tbody").append(riga);
            }
            $("#gestione-annotazioni").modal("show");
        }
    });
}

/*
   Gestisce la modifica di un annotazione temporanea
   @param id: id dell'annotazion da modificare
*/
function modificaAnnotazione(id){
    $("#gestione-annotazioni").modal("hide");
    modificaAnn = 1;
    var ann = annotazioniTemp[id];
    annotationType = ann.annotazione.type;
    //Preparo area riportante valore precedente
    $("#valorePrec").empty();
    $("#valorePrec").append("<span><b>Valore attuale:</b> " + ann.annotazione.body.label + "</span>");
    switch(annotationType){
        case "hasAuthor" :
            //Apro stesso tipo di modale utilizzata per inserimento nuova annotazione
            riempiSelect();
            abilitaAreaTesto();
            attivaWidget("instance-widget");
            $('#step2').modal('show');
            $('#step2 .modal-title').text('Modifica annotazione documento - Autore');
            //Sto modificando un annotazione Documento
            isAnnDocumento = 1;
            break;
        case "hasPublicationYear" :
            attivaWidget("date-widget");
            $('#step2').modal('show');
            $('#step2 .modal-title').text('Modifica annotazione documento - Pubblicazione');
            isAnnDocumento = 1;
            break;
        case "hasPublisher" :
            riempiSelect();
            abilitaAreaTesto();
            attivaWidget("instance-widget");
            $('#step2').modal('show');
            $('#step2 .modal-title').text('Modifica annotazione documento - Editore');
            isAnnDocumento = 1;
            break;
        case "hasTitle" :
            attivaWidget("shortText-widget");
            $('#step2').modal('show');
            $('#step2 .modal-title').text('Modifica annotazione documento - Titolo');
            isAnnDocumento = 1;
            break;
        case "hasAbstract" :
            attivaWidget("longText-widget");
            $('#step2').modal('show');
            $('#step2 .modal-title').text('Modifica annotazione documento - Riassunto');
            isAnnDocumento = 1;
            break;
        case "hasComment" :
            attivaWidget("longText-widget");
            $('#step2').modal('show');
            $('#step2 .modal-title').text('Modifica annotazione documento - Commento');
            isAnnDocumento = 1;
            break;
        case "hasShortTitle" :
            attivaWidget("shortText-widget");
            $('#step2').modal('show');
            $('#step2 .modal-title').text('Modifica annotazione documento - Titolo breve');
            isAnnDocumento = 1;
            break;
        case "denotesPerson" :
            riempiSelect();
            abilitaAreaTesto();
            attivaWidget("instance-widget");
            $('#step2 .modal-title').text('Modifica annotazione frammento - Persona');
            //Sto modificando un annotazione Frammento
            isAnnDocumento = 0;
            $('#step2').modal('show');
            break;
        case "denotesPlace" :
            riempiSelect();
            abilitaAreaTesto();
            attivaWidget("instance-widget");
            $('#step2 .modal-title').text('Modifica annotazione frammento - Luogo');
            isAnnDocumento = 0;
            $("#resourcePlaceDiv").empty();
            $('#step2').modal('show');
            break;
        case "denotesDisease" :
            riempiSelect();
            abilitaAreaTesto();
            attivaWidget("instance-widget");
            $('#step2 .modal-title').text('Modifica annotazione frammento - Malattia');
            isAnnDocumento = 0;
            $('#step2').modal('show');
            break;
        case "hasSubject" :
            riempiSelect();
            abilitaAreaTesto();
            attivaWidget("instance-widget");
            $('#step2 .modal-title').text('Modifica annotazione frammento - Argomento');
            isAnnDocumento = 0;
            $('#step2').modal('show');
            break;
        case "relatesTo" :
            $('#step2 .modal-title').text('Modifica annotazione frammento - DBPedia');
            isAnnDocumento = 0;
            attivaWidget('dbpedia-widget');
            $("#resourceDiv").empty();
            $('#step2').modal('show');
            break;
        case "hasClarityScore" :
            attivaWidget("choice-widget");
            setTitoloChoiceWidget();
            $('#step2 .modal-title').text('Modifica annotazione frammento - Chiarezza');
            isAnnDocumento = 0;
            $('#step2').modal('show');
            break;
        case "hasOriginalityScore" :
            attivaWidget("choice-widget");
            setTitoloChoiceWidget();
            $('#step2 .modal-title').text('Modifica annotazione frammento - Giudizio');
            isAnnDocumento = 0;
            $('#step2').modal('show');
            break;
        case "hasFormattingScore" :
            attivaWidget("choice-widget");
            setTitoloChoiceWidget();
            $('#step2 .modal-title').text('Modifica annotazione frammento - Presentazione');
            isAnnDocumento = 0;
            $('#step2').modal('show');
            break;
        case "cites" :
            attivaWidget("citation-widget");
            $('#step2 .modal-title').text('Modifica annotazione frammento - Citazione');
            isAnnDocumento = 0;
            $('#step2').modal('show');
            break;
        case "hasComment":
            attivaWidget("longText-widget");
            $('#step2 .modal-title').text('Modifica annotazione frammento - Commento');
            isAnnDocumento = 0;
            $('#step2').modal('show');
            break;
    }
    //Memorizzo id dell'annotazione che sto modificando
    annToMod = id;
}

/*
   Gestisce la conferma della modifica di un annotazione temporanea
*/
function confermaModifica(){
    var okToModify = false;
    var ann_label, oggetto, homepage = "";
    if(isAnnDocumento){
        switch(annotationType){
            case "hasAuthor":
                if($("#text-instance-author").val() != ""){
                    ann_label = $("#text-instance-author").val();
                    oggetto = "http://vitali.web.cs.unibo.it/AnnOtaria/person/"+ann_label.split(' ').join('-');
                }
                else {
                    ann_label = $("#select_instance").find(":selected").text();
                    oggetto = $("#select_instance").find(":selected").attr("data-uri");
                }
                okToModify = true;
                break;
            case "hasPublisher":
                if($("#text-instance-publisher").val() != ""){
                    ann_label = $("#text-instance-publisher").val();
                    oggetto = "http://vitali.web.cs.unibo.it/AnnOtaria/organization/"+ann_label.split(' ').join('-');
                }
                else{
                    ann_label = $("#select_instance").find(":selected").text();
                    oggetto = $("#select_instance").find(":selected").attr("data-uri");
                    homepage = $("#select_instance").find(":selected").attr("data-homep");
                }
                okToModify = true;
                break;
            case "hasPublicationYear":
                if($("#date-widget-text").val() == ""){
                    alert("Devi inserire un anno di pubblicazione");
                }
                else if($("#date-widget-text").val() > new Date().getFullYear()){
                    alert("Anno inserito successivo a quello corrente");
                }
                else if($("#date-widget-text").val() < $("#date-widget-text").attr("min")){
                    alert("Anno inserito inferiore al minimo possibile");
                }
                else{
                    ann_label = $("#date-widget-text").val();
                    oggetto = ann_label+"^^xsd:gYear";
                    okToModify = true;
                }
                break;
            case "hasTitle":
                if($("#shortText-widget-text").val() == ""){
                    alert("Devi inserire un titolo");
                }
                else{
                    ann_label = $("#shortText-widget-text").val();
                    oggetto = ann_label+"^^xsd:string";
                    okToModify = true;
                }
                break;
            case "hasAbstract":
                if($("#longText-widget-text").val() == ""){
                    alert("Devi inserire un riassunto");
                }
                else{
                    ann_label = $("#longText-widget-text").val();
                    oggetto = ann_label+"^^xsd:string";
                    okToModify = true;
                }
                break;
            case "hasShortTitle":
                if($("#shortText-widget-text").val() == ""){
                    alert("Devi inserire un titolo");
                }
                else{
                    ann_label = $("#shortText-widget-text").val();
                    oggetto = ann_label+"^^xsd:string";
                    okToModify = true;
                }
                break;
            case "hasComment":
                if($("#longText-widget-text").val() == ""){
                    alert("Devi inserire un commento");
                }
                else{
                    ann_label = $("#longText-widget-text").val();
                    oggetto = ann_label;
                    okToModify = true;
                }
                break;
        }
    }
    else {
        switch(annotationType){
            case "denotesPerson":
                ann_label = $("#textPerson").val();
                if(($("#textPerson").val() != "")){
                    ann_label = $("#textPerson").val();
                    oggetto = "http://vitali.web.cs.unibo.it/AnnOtaria/person/"+ann_label.split(' ').join('-');
                }
                else{
                    ann_label = $("#select_instance").find(":selected").text();
                    oggetto = $("#select_instance").find(":selected").attr("data-uri");
                }
                okToModify = true;
                break;
            case "denotesPlace":
                if($("#risultatiDBPediaPlaceSelect").find(":selected").text() != ""){
                    ann_label = $("#risultatiDBPediaPlaceSelect").find(":selected").text();
                    oggetto = $("#risultatiDBPediaPlaceSelect").find(":selected").val();
                }
                else{
                    ann_label = $("#select_instance").find(":selected").text();
                    oggetto = $("#select_instance").find(":selected").attr("data-uri");
                }
                okToModify = true;
                break;
            case "denotesDisease":
                if($("#text-disease").val() != ""){
                    ann_label = $("#text-disease").val();
                    oggetto = "http://www.icd10data.com/ICD10CM/Codes/"+ann_label.split(' ').join('-');
                }
                else{
                    ann_label = $("#select_instance").find(":selected").text();
                    oggetto = $("#select_instance").find(":selected").attr("data-uri");
                }
                okToModify = true;
                break;
            case "hasSubject":
                if($("#text-argument").val() != ""){
                    ann_label = $("#text-argument").val();
                    oggetto = "http://thes.bncf.firenze.sbn.it/"+ann_label.split(' ').join('-');
                }
                else{
                    ann_label = $("#select_instance").find(":selected").text();
                    oggetto = $("#select_instance").find(":selected").attr("data-uri");
                }
                okToModify = true;
                break;
            case "relatesTo":
                if(($('#risultatiDBPediaSelect').length)){
                    ann_label = $('#risultatiDBPediaSelect').find(":selected").text();
                    oggetto = $('#risultatiDBPediaSelect').find(":selected").val();
                    okToModify = true;
                }
                else{
                    alert("Devi selezionare un valore da DBPedia!");
                }
                break;
            case "hasClarityScore":
                ann_label = $("#choice-list").find(":selected").text();
                oggetto = ann_label;
                okToModify = true;
                break;
            case "hasOriginalityScore":
                ann_label = $("#choice-list").find(":selected").text();
                oggetto = ann_label;
                okToModify = true;
                break;
            case "hasFormattingScore":
                ann_label = $("#choice-list").find(":selected").text();
                oggetto = ann_label;
                okToModify = true;
                break;
            case "cites":
                var doc;
                if($("#citation-title-text").val() != "" && $("#citation-title-text").val() != "" ){
                    ann_label = $("#citation-title-text").val().split(' ').join('-');
                    oggetto = $("#citation-address-text").val();
                }
                else{
                    ann_label = $("#documentList").find(":selected").text();
                    oggetto = $("#documentList").find(":selected").val();
                }
                okToModify = true;
                break;
            case"hasComment":
                if($("#longText-widget-text").val() == ""){
                    alert("Devi inserire un commento");
                }
                else{
                    ann_label = $("#longText-widget-text").val();
                    oggetto = ann_label+"^^xsd:string";
                    okToModify = true;
                }
                break;
        }
    }
    if(okToModify == true){
        //Modifico l'annotazione temporanea
        annotazioniTemp[annToMod].annotazione.body.label = ann_label;
        annotazioniTemp[annToMod].annotazione.body.object = oggetto;
        //Se è presente attributo homepage
        if(homepage != ""){
            annotazioniTemp[annToMod].hp = homepage;
        }
        //Aggiorno modale con nuovo valore inserito
        $("#contenitore_ann div[id=\"tmp" + annotazioniTemp[annToMod].id + "\"]").find("p").text(ann_label);
        //Se sto modificando annotazione Documento, aggiorno <li>
        if(!annotazioniTemp[annToMod].pos_annot.hasOwnProperty("inizio_annotazione")){
            $("li[data-id=\"tmp" + annotazioniTemp[annToMod].id + "\"]").find("span").text(ann_label);
        }
        $('#step2').modal("hide");
        $('#btn_annotManage').trigger("click");
    }
}

/*
   Elimina una o più annotazioni temporanee
   @param id: id dell'annotazione da eliminare
   @param eliminaTutte: true = elimino tutte, false = elimino singola annotazione
*/
function eliminaAnnotazione(id, eliminaTutte){
    var ann = annotazioniTemp[id];
    //Elimino la modale corrispondente, che non cambia in base al tipo di annotazione
    $("#contenitore_ann div[id=\"tmp" + ann.id + "\"]").remove();
    //Sto eliminando un annotazione documento
    if(!ann.pos_annot.hasOwnProperty("inizio_annotazione")){
        $("li[data-id=\"tmp" + ann.id + "\"]").remove();
    }
    //Altrimenti annotazione frammento
    else{
        var span = $("#file span[data-id=\"tmp" + ann.id + "\"]");
        //Prima di eliminare annotazione, resetto informazioni su molteplicità
        //Se annotazione creata ha un solo padre
        if(span.parents(".annotation").length == 1){
            //Al padre elimino informazioni su molteplicità
            span.parent().removeAttr("annot-mult");
            span.parent().removeClass("annot_multiple");
        }
        //Se annotazione creata ha più di un padre non serve eliminare nulla
        //Prendo il parent dell'annotazione da eliminare
        var spanParent = span.parent();
        //Salvo il testo dell'elemento per risettarlo
        var allText = spanParent.text();
        spanParent.text(allText);
        span.remove();
    }
    //Se devo eliminare una singola annotazione
    if(!eliminaTutte){
        annotazioniTemp.splice(id, 1);
        //Aggiorno vecchie informazioni delle annotazioni rimanenti, che siano successive a quella eliminata
        for(var i = id; i < annotazioniTemp.length; i++){
            //Memorizzo id precedente che servirà in fase di aggiornamento
            var oldId = annotazioniTemp[i].id;
            //Aggiorno id della annotazione
            annotazioniTemp[i].id = i;
            //Se annotazione temporanea è del documento corrente, la aggiorno in base al tipo
            if(annotazioniTemp[i].pos_annot.articolo == "ao:" + docSelected + ".html"){
                //Aggiorno l'id della modale, che non cambia in base al tipo di annotazione
                $("#contenitore_ann div[id=\"tmp" + oldId + "\"]").attr("id", "tmp" + annotazioniTemp[i].id);
                //In seguito aggiorno, in base al tipo, <li> oppure <span>
                if(!annotazioniTemp[i].pos_annot.hasOwnProperty("inizio_annotazione")){
                    //Aggiorno attributo data-id
                    $("li[data-id=\"tmp" + oldId + "\"]").attr("data-id", "tmp" + annotazioniTemp[i].id);
                    //Aggiorno anche onclick
                    $("li[data-id=\"tmp" + annotazioniTemp[i].id + "\"]").find("span")
                        .attr("onclick", 'viewAnnotationDetails("tmp' + annotazioniTemp[i].id + '")');
                }
                else{
                    $("#file span[data-id=\"tmp" + oldId + "\"]").attr("data-id", "tmp" + annotazioniTemp[i].id);
                    $("#file span[data-id=\"tmp" + annotazioniTemp[i].id + "\"]").attr("onclick",
                            'viewAnnotationDetails("tmp' + annotazioniTemp[i].id + '")');
                }
            }
        }
        //Verifico che ci siano altre annotazioni temporanee da mostrare, altrimenti chiudo modale
        if(annotazioniTemp.length == 0){
            $("#gestione-annotazioni").modal("hide");
        }
        //Simulo click per restituire messaggio
        $('#btn_annotManage').trigger("click");
    }
}

/*
   Gestisce eliminazione di tutte le annotazioni temporanee
*/
function eliminaAnnotazioniTemp(){
    //Per ogni annotazione temporanea
    for(var i = 0; i < annotazioniTemp.length; i++){
        //Passo id e dichiaro che voglio cancellarle tutte
        eliminaAnnotazione(i, true);
    }
    //Svuoto memoria
    annotazioniTemp = [];
    $("#gestione-annotazioni").modal("hide");
    //Se è attiva la modalità annotatore, simulo click per restituire messaggio
    if(mode == 1){
        $('#btn_annotManage').trigger("click");
    }
}

/*
   Gestisce l'inserimento di tutte le annotazioni temporanee
*/
function confermaAnnotazioniTemp(){
    $("#confirm-tempAnn").click(function(){
        insertAuthor(mail,username);
        for(var i = 0; i < annotazioniTemp.length; i++){
            inserisciAnnotazione(i);
        }
        annotazioniTemp = [];
        $("#gestione-annotazioni").modal("hide");
        alert("Annotazioni inserite correttamente!");
    });
}


function insertAuthor(email, nome){
    var myquery = prefix;
  	myquery = myquery + "INSERT DATA{\
  				<mailto:"+email+"> a foaf:Person ;\
  				foaf:name \""+nome+"\";\
  				schema:email \""+email+"\".\
  				}";
	console.log(myquery);
	var encodedquery = encodeURIComponent(myquery);
	console.log(encodedquery);
	var queryUrl = endpointFusekiURL + "update?update=" + encodedquery;
	console.log(queryUrl);
	$.ajax({
    	dataType: "html",
    	type: 'POST',
    	contentType: "application/x-www-form-urlencoded",
    	url:queryUrl ,
    	success:function(d) {
        	console.log("Author inserted");
    	},
    	error: function(jqXHR, textStatus, errorThrown) {
        	console.log("error insert author");
    	}
	});
}

/*
   Inserisce l'annotazione nel triple-store
   @param i: indice dell'annotazione da inserire
*/
function inserisciAnnotazione(i){
    var query = prefix;
    var annTemp = annotazioniTemp[i];
    var annType = annTemp.annotazione.type;
    var soggetto;
    //Prima impostiamo i campi che sono comuni a tutte le annotazioni
    query = query+ "INSERT DATA{\
            [ a				 oa:Annotation;\
            rdfs:label	 \"" + annTemp.annotazione.label + "\";\
            ao:type		 \"" + annTemp.annotazione.type + "\";\
            oa:annotatedAt \"" + annTemp.origine.time + "\";\
            oa:annotatedBy <mailto:" + annTemp.origine.autore.email + ">;";
    //L'annotazione è di tipo Frammento
    if(annTemp.pos_annot.hasOwnProperty("inizio_annotazione")){
        query = query+	"oa:hasTarget	[ a oa:SpecificResource ;\
                oa:hasSelector [ a oa:FragmentSelector ;\
                rdf:value \"" + annTemp.pos_annot.id + "\" ;\
                oa:end \"" + annTemp.pos_annot.fine_annotazione + "\"^^xsd:nonNegativeInteger;\
                oa:start \"" + annTemp.pos_annot.inizio_annotazione + "\"^^xsd:nonNegativeInteger\
                ];\
                oa:hasSource " + annTemp.pos_annot.articolo + "\
                ];";
        soggetto = "<" + annTemp.annotazione.body.subject + ">";
    }
    //Tipo Documento
    else{
        query = query + "oa:hasTarget	" + annTemp.pos_annot.articolo + ";";
        soggetto = annTemp.annotazione.body.subject;
    }
    query += "oa:hasBody	[ a		rdf:Statement;\
              rdf:predicate	"+ annTemp.annotazione.body.predicate + ";\
              rdf:subject	" + soggetto + ";\
              rdfs:label	\"" + annTemp.annotazione.body.label + "\";";
    //Settiamo i dettagli in base al tipo di annotazione
    switch(annType){
        case "hasAuthor":
            query = query +  "rdf:object	<" + annTemp.annotazione.body.object + ">\
                    ]\
                    ].\
                    <" + annTemp.annotazione.body.object + "> a foaf:Person;\
                    foaf:name \"" + annTemp.annotazione.body.label + "\".}";
            break;
        case "hasPublisher":
            query = query + "rdf:object	<" + annTemp.annotazione.body.object + ">\
                    ]\
                    ].\
                    <" + annTemp.annotazione.body.object + "> a foaf:Organization;\
                    foaf:homepage \"" + annTemp.hp + "\";\
                    foaf:name \"" + annTemp.annotazione.body.label + "\".}";
            break;
        case "hasPublicationYear":
            query = query + "rdf:object	\"" + annTemp.annotazione.body.object + "\"^^xsd:gYear\
                    ]].}";
    break;
        case "hasTitle":
        case "hasAbstract":
        case "hasShortTitle":
        case "hasComment":
    query = query + "rdf:object	\"" + annTemp.annotazione.body.object + "\"^^xsd:string\
            ]].}";
    break;
        case "denotesPerson":
    query = query + "rdf:object	<" + annTemp.annotazione.body.object + ">\
            ]].\
            <" + annTemp.annotazione.body.object + "> a foaf:Person;\
            foaf:name \"" + annTemp.annotazione.body.label + "\".}";
    break;
        case "denotesPlace":
    query = query + "rdf:object	<" + annTemp.annotazione.body.object + ">;\
            ]].\
            <" + annTemp.annotazione.body.object+"> a dbpedia:Place;\
            rdfs:label \"" + annTemp.annotazione.body.label + "\".}";
    break;
        case "denotesDisease":
    query = query + "rdf:object	<" + annTemp.annotazione.body.object + ">;\
            ]].\
            <" + annTemp.annotazione.body.object + "> a <http://www.w3.org/2004/02/skos/core#Concept>;\
            rdfs:label \"" + annTemp.annotazione.body.label + "\".}";
    break;
        case "hasSubject":
        case "relatesTo":
        case "hasClarityScore":
        case "hasOriginalityScore":
        case "hasFormattingScore":
    query = query + "rdf:object	<" + annTemp.annotazione.body.object + ">;\
            ]].\
            <" + annTemp.annotazione.body.object + "> a skos:Concept;\
            rdfs:label \"" + annTemp.annotazione.body.label + "\".}";
    break;
        case "cites":
    query = query + "rdf:object	<" + annTemp.annotazione.body.object + ">;\
            ]].\
            <"+annTemp.annotazione.body.object+"> a fabio:Expression;\
            fabio:hasRepresentation <" + annTemp.annotazione.body.label + ">.\
            <" + annTemp.annotazione.body.label + "> a fabio:Item.\
    }";
    break;
    }
    var encodedquery = encodeURIComponent(query);
    var queryUrl = endpointFusekiURL + "update?update=" + encodedquery;
    $.ajax({
        dataType: "html",
        type: 'POST',
        contentType: "application/x-www-form-urlencoded",
        url:queryUrl ,
        success: function(d) {
            //Aggiorno informazioni annotazione salvata per non ricaricare documento
            convertiIdTemp(annTemp);
            return true;
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert("Errore nell'inserimento delle annotazioni -- "+errorThrown);
            return false;
        }
    });
}

/*
   Converte gli id dell'annotazione e della relativa modale per mantenerle visibili dopo il salvataggio
   e non ricaricare il documento
   @param annotazione: annotazione salvata da aggiornare
*/
function convertiIdTemp(annotazione){
    //Aggiorno id della modale
    $("#contenitore_ann div[id=\"tmp" + annotazione.id + "\"]").attr("id", "saved" + annotazione.id);
    //Annotazione frammento
    if(annotazione.pos_annot.hasOwnProperty("inizio_annotazione")){
        //Aggiorno attributi data-id e onclick
        $("#file span[data-id=\"tmp" + annotazione.id + "\"]").attr("data-id", "saved" + annotazione.id);
        $("#file span[data-id=\"saved" + annotazione.id + "\"]").attr("onclick",
                'viewAnnotationDetails("saved' + annotazione.id + '")');
    }
    //Annotazione documento
    else{
        $("li[data-id=\"tmp" + annotazione.id + "\"]").attr("data-id", "saved" + annotazione.id);
        $("li[data-id=\"saved" + annotazione.id + "\"]").find("span")
            .attr("onclick", 'viewAnnotationDetails("saved' + annotazione.id + '")');
    }
}

/*

*/
function main(){
    caricaElencoDocumenti();
    filteringByAuthor();
    chiudiDialog();
    setTextBorderSelected();
    setLoginParameter();
    annotaFrammento();
    annotaDocumento();
    gestisciChiusuraModali();
    startAnnotatorMode();
    exitAnnotatorMode();
    confermaAnnotazione();
    inserimentoData();
    manageAnnotations();
    ricercaDBPedia();
    eliminaAnnotazioniTemp();
    confermaAnnotazioniTemp();

    //Setto attributi e comportamenti delle modali e di altri componenti Bootstrap
    $(function(){
        //Aggancio componente ad elemento HTML
        $('#help-tooltip').tooltip({
            'placement': 'right',
            'title': 'Verranno nascoste le annotazioni precedenti alla data inserita'
        });

        $('#author-tooltip').tooltip({
            'placement': 'right',
            'title': 'Verranno mantenute solo le annotazioni dell\'\autore inserito'
        });

        $('.modal #instance-tooltip').tooltip({
            'placement': 'right',
            'title': 'Compilando il campo di testo verrà ignorata l\'\opzione selezionata dalla lista'
        });

        $('.modal #citation-tooltip').tooltip({
            'placement': 'right',
            'title': 'Compilando entrambi i campi di testo verrà ignorata l\'\opzione selezionata dalla lista'
        });

        $('.modal #place-tooltip').tooltip({
            'placement': 'right',
            'title': 'Eseguendo una ricerca valida verrà ignorata l\'\opzione selezionata dalla lista'
        });

        $.datepicker.setDefaults({
            dateFormat: 'yy-mm-dd',
        });
        $('#date-setter').datepicker();

        $('#date-setter').datepicker('disable');
        $('#check-date-filter').attr('disabled', 'true');

        //Dopo aver mostrato la modale rendo la pagina in sfondo non scorrevole
        $('#step2').on('shown.bs.modal', function (e) {
        	$("body").addClass("modal-open");
        });
    });

}

$(document).ready(function() {
    main();
});
