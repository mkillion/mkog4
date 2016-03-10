require([
	"dojo/_base/lang",
	"dojo/on",
	"dojo/dom",
    "dojo/window",
    "dojo/_base/array",
    "dojo/store/Memory",
    "dojo/dom-construct",
    "dijit/form/ComboBox",
	"application/Drawer",
    "application/DrawerMenu",
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/ArcGISTiledLayer",
    "esri/layers/ArcGISDynamicLayer",
    "esri/widgets/Search",
    "esri/widgets/Search/SearchViewModel",
    "esri/widgets/Home",
    "esri/widgets/Home/HomeViewModel",
    "esri/widgets/Locate",
    "esri/widgets/Locate/LocateViewModel",
    "esri/PopupTemplate",
    "esri/widgets/Popup",
    "esri/tasks/IdentifyTask",
    "esri/tasks/support/IdentifyParameters",
    "esri/tasks/FindTask",
    "esri/tasks/support/FindParameters",
    "esri/geometry/Point",
    "esri/geometry/SpatialReference",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/layers/GraphicsLayer",
    "esri/symbols/SimpleLineSymbol",
    "esri/Graphic",
    "esri/tasks/GeometryService",
    "esri/tasks/support/ProjectParameters",
    "esri/geometry/support/webMercatorUtils",
    "esri/layers/ArcGISImageLayer",
    "dojo/domReady!"
],
function(
	lang,
	on,
	dom,
    win,
    arrayUtils,
    Memory,
    domConstruct,
    ComboBox,
	Drawer,
	DrawerMenu,
    Map,
    MapView,
    ArcGISTiledLayer,
    ArcGISDynamicLayer,
    Search,
    SearchVM,
    Home,
    HomeVM,
    Locate,
    LocateVM,
    PopupTemplate,
    Popup,
    IdentifyTask,
    IdentifyParameters,
    FindTask,
    FindParameters,
    Point,
    SpatialReference,
    SimpleMarkerSymbol,
    GraphicsLayer,
    SimpleLineSymbol,
    Graphic,
    GeometryService,
    ProjectParameters,
    webMercatorUtils,
    ArcGISImageLayer
) {
    var isMobile = WURFL.is_mobile;
	var idDef = [];

    // Set up basic frame:
    window.document.title = "FooBar";
    $("#title").html("Kansas Oil and Gas<a id='kgs-brand' href='http://www.kgs.ku.edu'>Kansas Geological Survey</a>");

    var showDrawerSize = 850;

	var drawer = new Drawer( {
        showDrawerSize: showDrawerSize,
        borderContainer: 'bc_outer',
        contentPaneCenter: 'cp_outer_center',
        contentPaneSide: 'cp_outer_left',
        toggleButton: 'hamburger_button'
    } );
    drawer.startup();

    // Broke the template drawer open/close behavior when paring down the code, so...
    $("#hamburger_button").click(function(e) {
        e.preventDefault();
        if ($("#cp_outer_left").css("width") === "293px") {
            $("#cp_outer_left").css("width", "0px");
        } else {
            $("#cp_outer_left").css("width", "293px");
        }
    } );

    createMenus();
    createTools();
    popCountyDropdown();
    createFilterDialogs();

    // Combo boxes:
    var autocomplete =  (isMobile) ? false : true; // auto-complete doesn't work properly on mobile (gets stuck on a name and won't allow further typing), so turn it off.
    $.get("fields_json.txt", function(response) {
		// fields_json.txt is updated as part of the og fields update process.
        var fieldNames = JSON.parse(response).items;
        var fieldStore = new Memory( {data: fieldNames} );
        var comboBox = new ComboBox( {
            id: "field-select",
            store: fieldStore,
            searchAttr: "name",
            autoComplete: autocomplete
        }, "field-select").startup();
    } );

	$.get("operators_json.txt", function(response) {
		// operators_json.txt is updated with the nightly og wells update.
        var ops = JSON.parse(response).items;
        var opsStore = new Memory( {data: ops} );
        var comboBox = new ComboBox( {
            id: "operators",
            store: opsStore,
            searchAttr: "name",
            autoComplete: autocomplete
        }, "operators").startup();
    } );

    // End framework.

    // Create map and map widgets:
    var ogGeneralServiceURL = "http://services.kgs.ku.edu/arcgis2/rest/services/oilgas/oilgas_general/MapServer";
    var identifyTask, identifyParams;
    var findTask = new FindTask(ogGeneralServiceURL);
    var findParams = new FindParameters();

    var basemapLayer = new ArcGISTiledLayer( {url:"http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer", id:"Base Map"} );
    var fieldsLayer = new ArcGISDynamicLayer( {url:"http://services.kgs.ku.edu/arcgis2/rest/services/oilgas/oilgas_fields/MapServer", id:"Oil and Gas Fields", visible:false} );
    var wellsLayer = new ArcGISDynamicLayer( {url:ogGeneralServiceURL, visibleLayers:[0], id:"Oil and Gas Wells"} );
    var plssLayer = new ArcGISTiledLayer( {url:"http://services.kgs.ku.edu/arcgis2/rest/services/plss/plss/MapServer", id:"Section-Township-Range"} );
    var wwc5Layer = new ArcGISDynamicLayer( {url:"http://services.kgs.ku.edu/arcgis2/rest/services/wwc5/wwc5_general/MapServer", visibleLayers:[8], id:"WWC5 Water Wells", visible:false} );
    var usgsEventsLayer = new ArcGISDynamicLayer( {url:ogGeneralServiceURL, visibleLayers:[13], id:"Earthquakes", visible:false} );
    var lepcLayer = new ArcGISDynamicLayer( {url:"http://kars.ku.edu/arcgis/rest/services/Sgpchat2013/SouthernGreatPlainsCrucialHabitatAssessmentTool2LEPCCrucialHabitat/MapServer", id:"LEPC Crucial Habitat", visible: false} );
    var topoLayer = new ArcGISDynamicLayer( {url:"http://services.kgs.ku.edu/arcgis7/rest/services/Elevation/USGS_Digital_Topo/MapServer", visibleLayers:[11], id:"Topography", visible:false } );
    var naip2014Layer = new ArcGISImageLayer( {url:"http://services.kgs.ku.edu/arcgis7/rest/services/IMAGERY_STATEWIDE/FSA_NAIP_2014_Color/ImageServer", id:"2014 Aerials", visible:false} );
    var doqq2002Layer = new ArcGISImageLayer( {url:"http://services.kgs.ku.edu/arcgis7/rest/services/IMAGERY_STATEWIDE/Kansas_DOQQ_2002/ImageServer", id:"2002 Aerials", visible:false} );
    var doqq1991Layer = new ArcGISImageLayer( {url:"http://services.kgs.ku.edu/arcgis7/rest/services/IMAGERY_STATEWIDE/Kansas_DOQQ_1991/ImageServer", id:"1991 Aerials", visible:false} );

    var map = new Map( {
        // Not defining basemap here for TOC toggle reasons.
        //basemap: "topo",
        layers: [basemapLayer, doqq1991Layer, doqq2002Layer, naip2014Layer, topoLayer, lepcLayer, fieldsLayer, plssLayer, usgsEventsLayer, wwc5Layer, wellsLayer]
    } );
    map.then(createTOC, mapErr);

    var graphicsLayer = new GraphicsLayer();
    map.add(graphicsLayer);

    var view = new MapView( {
        map: map,
        container: "mapDiv",
        center: [-98, 38],
        zoom: 7,
        ui: { components: ["zoom"] }
    } );

    view.then(function() {
        on(view, "click", executeIdTask);

        identifyTask = new IdentifyTask(ogGeneralServiceURL);
        identifyParams = new IdentifyParameters();
        identifyParams.tolerance = (isMobile) ? 9 : 3;
        identifyParams.layerIds = [0, 13, 8, 1];
        identifyParams.layerOption = "visible";
        identifyParams.width = view.width;
        identifyParams.height = view.height;

        // Define additional popup actions:
        var fullInfoAction = {
            title: "Full Report",
            id: "full-report",
            className: "esri-icon-documentation"
        };
        view.popup.viewModel.actions.push(fullInfoAction);

        var bufferFeatureAction = {
            title: "Buffer Feature",
            id: "buffer-feature",
            className: "esri-icon-radio-checked"
        };
        view.popup.viewModel.actions.push(bufferFeatureAction);

        var reportErrorAction = {
            title: "Report a Location or Data Problem",
            id: "report-error",
            className: "esri-icon-contact"
        };
        view.popup.viewModel.actions.push(reportErrorAction);

        view.popup.viewModel.on("action-click", function(evt){
            if(evt.action.id === "full-report") {
                showFullInfo();
            } else if (evt.action.id === "buffer-feature") {
                // TODO:
                console.log("buffer feature action clicked");
            } else if (evt.action.id === "report-error") {
                // TODO:
                console.log("report error action clicked");
            }
        } );
    } );


    function mapErr(err) {
        console.log("Map Error: " + err);
    }

    var searchWidget = new Search( {
        //Setting widget properties via viewModel is subject to
        //change for the 4.0 final release
        viewModel: new SearchVM( {
          view: view
        } )
    }, "srch");
    searchWidget.startup();

    /*$("#mobileGeocoderIconContainer").click(function() {
        $("#lb").toggleClass("small-search");
    } );*/

    var homeBtn = new Home( {
        //Setting widget properties via viewModel is subject to
        //change for the 4.0 final release
        viewModel: new HomeVM( {
            view: view
        } )
    }, "HomeButton");
    homeBtn.startup();

    var locateBtn = new Locate({
        //Setting widget properties via viewModel is subject to
        //change for the 4.0 final release
        viewModel: new LocateVM({
            view: view,
            scale: 4000
        } )
    }, "LocateButton");
    locateBtn.startup();

    // End map and map widgets.

    urlZoom(location.search.substr(1));

    // Side-panel click handlers:
    // TODO: following click function is only for testing opening a popup from a link; in future versions link would be a value in a table cell.
    $("#junktest").click(function() {
        var kid = $("#junktest").html();
        findWell(kid);
        // TODO: zoom to feature from side-panel link.
    } );

    $(".find-header").click(function() {
        $("[id^=find]").fadeOut("medium");
        $(".find-header").removeClass("esri-icon-down-arrow");
        $(this).addClass("esri-icon-down-arrow");
        var findBody = $(this).attr("id");
        $("#find-"+findBody).fadeIn("medium");
    } );

    $(".esri-icon-erase").click(function() {
        graphicsLayer.clear();
    } );


    function popCountyDropdown() {
        var cntyArr = new Array("Allen", "Anderson", "Atchison", "Barber", "Barton", "Bourbon", "Brown", "Butler", "Chase", "Chautauqua", "Cherokee", "Cheyenne", "Clark", "Clay", "Cloud", "Coffey", "Comanche", "Cowley", "Crawford", "Decatur", "Dickinson", "Doniphan", "Douglas", "Edwards", "Elk", "Ellis", "Ellsworth", "Finney", "Ford", "Franklin", "Geary", "Gove", "Graham", "Grant", "Gray", "Greeley", "Greenwood", "Hamilton", "Harper", "Harvey", "Haskell", "Hodgeman", "Jackson", "Jefferson", "Jewell", "Johnson", "Kearny", "Kingman", "Kiowa", "Labette", "Lane", "Leavenworth", "Lincoln", "Linn", "Logan", "Lyon", "McPherson", "Marion", "Marshall", "Meade", "Miami", "Mitchell", "Montgomery", "Morris", "Morton", "Nemaha", "Neosho", "Ness", "Norton", "Osage", "Osborne", "Ottawa", "Pawnee", "Phillips", "Pottawatomie", "Pratt", "Rawlins", "Reno", "Republic", "Rice", "Riley", "Rooks", "Rush", "Russell", "Saline", "Scott", "Sedgwick", "Seward", "Shawnee", "Sheridan", "Sherman", "Smith", "Stafford", "Stanton", "Stevens", "Sumner", "Thomas", "Trego", "Wabaunsee", "Wallace", "Washington", "Wichita", "Wilson", "Woodson", "Wyandotte");

        for(var i=0; i<cntyArr.length; i++) {
            theCnty = cntyArr[i];
            $('#lstCounty').append('<option value="' + theCnty + '">' + theCnty + '</option>');
        }
    }


    function createFilterDialogs() {
        // earthquakes:
        var magOptions = "<option value='all'>All</option><option value='2'>2.0 to 2.9</option><option value='3'>3.0 to 3.9</option><option value='4'>4.0 +</option>";
        var eqF = "<span class='filter-hdr'>By Day:</span><br>";
        eqF += "<table><tr><td class='find-label'>From:</td><td><input type='text' size='12' id='eq-from-date' placeholder='mm/dd/yyyy'></td></tr>";
        eqF += "<tr><td class='find-label'>To:</td><td><input type='text' size='12' id='eq-to-date' placeholder='mm/dd/yyyy'></td></tr>";
        eqF += "<tr><td class='find-label'>Magnitude:</td><td><select name='day-mag' id='day-mag'>";
        eqF += magOptions;
        eqF += "</select></td></tr><tr><td></td><td><button class='find-button' id='day-btn' onclick='filterQuakes(this.id);'>Apply Filter</button></td></tr></table><hr>";
        eqF += "<span class='filter-hdr'>By Year</span><br>";
        eqF += "<table><tr><td class='find-label'>Year:</td><td><select name='year' id='year'><option value='all'>All</option>";
        for (var y=2016; y>2012; y--) {
            eqF += "<option value='" + y + "'>" + y + "</option>";
        }
        eqF += "</select></td></tr>";
        eqF += "<tr><td class='find-label'>Magnitude:</td><td><select name='year-mag' id='year-mag'>";
        eqF += magOptions;
        eqF += "</select></td></tr>";
        eqF += "<tr><td></td><td><button class='find-button' id='year-btn' onclick='filterQuakes(this.id);'>Apply Filter</button></td></tr></table><hr>";
        eqF += "<button onclick='filterQuakesLast();'>Show Last Event in Kansas</button><hr>";
        eqF += "<button onclick='clearQuakeFilter();' autofocus>Clear Filter</button>";

        var eqN = domConstruct.create("div", { id: "eq-filter", class: "filter-dialog", innerHTML: eqF } );
        $("body").append(eqN);

        $("#eq-filter").dialog( {
            autoOpen: false,
            dialogClass: "dialog",
			title: "Filter Earthquakes",
            width: 270
        } );

        $("#eq-from-date").datepicker( {
            minDate: new Date("01/01/2013")
        } );
        $("#eq-to-date").datepicker();

        // wwc5 wells:
		var wwc5Status = ["Constructed","Plugged","Reconstructed"];
		var wwc5Use = ["Air Conditioning","Cathodic Protection Borehole","Dewatering","Domestic","Domestic, Livestock","Domestic, changed from Irrigation","Domestic, changed from Oil Field Water Supply","Environmental Remediation, Air Sparge","Environmental Remediation, Injection","Environmental Remediation, Recovery","Environmental Remediation, Soil Vapor Extraction","Feedlot","Feedlot/Livestock/Windmill","Geothermal, Closed Loop, Horizontal","Geothermal, Closed Loop, Vertical","Geothermal, Open Loop, Inj. of Water","Geothermal, Open Loop, Surface Discharge","Heat Pump (Closed Loop/Disposal), Geothermal","Industrial","Injection well/air sparge (AS)/shallow","Irrigation","Lawn and Garden - domestic only","Monitoring well/observation/piezometer","Oil Field Water Supply","Other","Pond/Swimming Pool/Recreation","Public Water Supply","Recharge Well","Recovery/Soil Vapor Extraction/Soil Vent","Road Construction","Test Hole, Cased","Test Hole, Geotechnical","Test Hole, Uncased","Test hole/well","(unstated)/abandoned"];
		var wwc5F = "<span class='filter-hdr'>Completion Date:</span><br>";
        wwc5F += "<table><tr><td class='find-label'>From:</td><td><input type='text' size='12' id='wwc5-from-date' placeholder='mm/dd/yyyy'></td>";
        wwc5F += "<td class='find-label'>To:</td><td><input type='text' size='12' id='wwc5-to-date' placeholder='mm/dd/yyyy'></td></tr></table>";
		wwc5F += "<span class='filter-hdr'>Construction Status:</span><br><table>";
		for (var i = 0; i < wwc5Status.length; i++) {
			wwc5F += "<tr><td><input type='checkbox' name='const-status' value='" + wwc5Status[i] + "'>" + wwc5Status[i] + "</td></tr>"
		}
		wwc5F += "</table>"
		wwc5F += "<span class='filter-hdr'>Well Use:</span><br>";
		wwc5F += "<table><tr><td><select id='well-use' multiple size='6'>";
		if (!isMobile) {
			wwc5F += "<option value='' class='opt-note'>select one or many (ctrl or cmd)</option>";
		}
		for (var k = 0; k < wwc5Use.length; k++) {
			wwc5F += "<option value='" + wwc5Use[k] + "'>" + wwc5Use[k] + "</option>";

		}
		wwc5F += "</select></td></tr>";
		wwc5F += "<tr><td colspan='2'><button class='find-button' id='wwc5-go-btn' onclick='filterWWC5();'>Apply Filter</button>&nbsp;&nbsp;<button class='find-button' onclick='clearwwc5F();' autofocus>Clear Filter</button></td></tr>";
		wwc5F += "</table>";

        var wwc5N = domConstruct.create("div", { id: "wwc5-filter", class: "filter-dialog", innerHTML: wwc5F } );
        $("body").append(wwc5N);

        $("#wwc5-filter").dialog( {
            autoOpen: false,
            dialogClass: "dialog",
			title: "Filter Water Wells",
            width: 450
        } );

		$("#wwc5-from-date").datepicker();
        $("#wwc5-to-date").datepicker();

        // og wells:
		var wellType = ["Coal Bed Methane","Coal Bed Methane, Plugged","Dry and Abandoned","Enhanced Oil Recovery","Enhanced Oil Recovery, Plugged","Gas","Gas, Plugged","Injection","Injection, Plugged","Intent","Location","Oil","Oil and Gas","Oil and Gas, Plugged","Oil, Plugged","Other","Other, Plugged","Salt Water Disposal","Salt Water Disposal, Plugged"];
		var ogF = "<span class='filter-hdr'>Well Type:</span><br>";
		ogF += "<table><tr><td><select id='og-well-type' class='og-select' multiple size='4'>";
		if (!isMobile) {
			ogF += "<option value='' class='opt-note'>select one or many (ctrl or cmd)</option>";
		}
		for (var j = 0; j < wellType.length; j++) {
			ogF += "<option value='" + wellType[j] + "'>" + wellType[j] + "</option>";
		}
		ogF += "</select></td></tr></table>";
		ogF += "<span class='filter-hdr'>Completion Date:</span><br>";
		ogF += "<table><tr><td class='find-label'>From:</td><td><input type='text' size='12' id='og-from-date' class='og-input' placeholder='mm/dd/yyyy'></td></tr>";
        ogF += "<tr><td class='find-label'>To:</td><td><input type='text' size='12' id='og-to-date' class='og-input' placeholder='mm/dd/yyyy'></td></tr></table>";
		ogF += "<table><tr><td class='filter-hdr' style='padding-left:0'>Operator:</td><td><input id='operators'></td></tr></table>";
		ogF += "<table><tr><td class='filter-hdr' style='padding-left:0'>Has:</td><td><input type='checkbox' name='og-has' value='paper-log'>Paper Logs</td></tr>";
		ogF += "<tr><td></td><td><input type='checkbox' name='og-has' value='scan-log'>Scanned Logs</td></tr>";
		ogF += "<tr><td></td><td><input type='checkbox' name='og-has' value='las'>LAS File</td></tr>";
		ogF += "<tr><td></td><td><input type='checkbox' name='og-has' value='core'>Core</td></tr>";
		ogF += "<tr><td></td><td><input type='checkbox' name='og-has' value='cuttings'>Cuttings</td></tr></table>";
		ogF += "<table><tr><td class='filter-hdr' style='padding-left:0'>Injection Wells:</td>";
		ogF += "<td><select id='inj' class='og-select'><option value=''></option><option value='inj-1'>Class I</option><option value='inj-2'>Class II</option></select></td></tr>";
		ogF += "<tr><td class='filter-hdr'style='padding-left:0'>Horizontal Wells:</td><td><input type='checkbox' id='hrz'></td></tr></table>";
		ogF += "<span class='filter-hdr'>Total Depth (ft):</span><br>";
		ogF += "<table><tr><td>Greater Than or Equal To:</td><td><input type='text' size='4' id='og-gt-depth' class='og-input'></td></tr>";
        ogF += "<tr><td>Less Than or Equal To:</td><td><input type='text' size='4' id='og-lt-depth' class='og-input'></td></tr></table>";
		ogF += "<hr><button class='find-button' id='wwc5-go-btn' onclick='filterOG();'>Apply Filter</button>&nbsp;&nbsp;&nbsp;";
		ogF += "<button class='find-button' onclick='clearOgFilter();' autofocus>Clear Filter</button>";

		var ogN = domConstruct.create("div", { id: "og-filter", class: "filter-dialog", innerHTML: ogF } );
        $("body").append(ogN);

        $("#og-filter").dialog( {
            autoOpen: false,
            dialogClass: "dialog",
			title: "Filter Oil and Gas Wells",
            width: 315
        } );

		$("#og-from-date").datepicker();
        $("#og-to-date").datepicker();
    }


	filterOG = function() {
		var def = [];
		var theWhere = "";
		var typeWhere = "";
		var dateWhere = "";
		var opWhere = "";
		var injWhere = "";
		var hrzWhere = "";
		var depthWhere = "";
		var paperLogWhere = "";
		var scanLogWhere = "";
		var lasWhere = "";
		var coreWhere = "";
		var cuttingsWhere = "";
		var ogType = $("#og-well-type").val();
		var fromDate = dom.byId("og-from-date").value;
		var toDate = dom.byId("og-to-date").value;
		var op = dom.byId(operators).value;
		var ogHas = $('input[name="og-has"]:checked').map(function() {
		    return this.value;
		} ).get();
		var inj = dom.byId("inj").value;
		var depthGT = dom.byId("og-gt-depth").value;
		var depthLT = dom.byId("og-lt-depth").value;

		if (ogType) {
			var typeList = "'" + ogType.join("','") + "'";
			typeWhere = "status_txt in (" + typeList +")";
		}

		if (fromDate && toDate) {
			dateWhere = "completion_date >= to_date('" + fromDate + "','mm/dd/yyyy') and completion_date < to_date('" + toDate + "','mm/dd/yyyy') + 1";
		} else if (fromDate && !toDate) {
			dateWhere = "completion_date >= to_date('" + fromDate + "','mm/dd/yyyy')";
		} else if (!fromDate && toDate) {
			dateWhere = "completion_date < to_date('" + toDate + "','mm/dd/yyyy') + 1";
		}

		if (op) {
			opWhere = "curr_operator = '" + op + "'";
		}

		if (inj) {
			if (inj === "inj-1") {
				injWhere = "well_type = 'CLASS1'";
			} else {
				injWhere = "status in ('SWD','EOR','INJ')";
			}
		}

		if (dom.byId(hrz).checked) {
			hrzWhere = "substr(api_workovers, 1, 2) <> '00'";
		}

		if (depthGT && depthLT) {
			if (parseInt(depthLT) < parseInt(depthGT)) {
				alert("Invalid depth values: less-than value must be larger than greater-than value.");
			} else {
				depthWhere = "rotary_total_depth >= " + depthGT + " and rotary_total_depth <= " + depthLT;
			}
		} else if (depthGT && !depthLT) {
			depthWhere = "rotary_total_depth >= " + depthGT;
		} else if (!depthGT && depthLT) {
			depthWhere = "rotary_total_depth <= " + depthLT;
		}

		for (var y=0; y<ogHas.length; y++) {
			switch (ogHas[y]) {
				case "paper-log":
					paperLogWhere = "kid in (select well_header_kid from elog.log_headers)";
					break;
				case "scan-log":
					scanLogWhere = "kid in (select well_header_kid from elog.scan_urls)";
					break;
				case "las":
					lasWhere = "kid in (select well_header_kid from las.well_headers where proprietary = 0)";
					break;
				case "core":
					coreWhere = "kid in (select well_header_kid from core.core_headers)";
					break;
				case "cuttings":
					cuttingsWhere = "kid in (select well_header_kid from cuttings.boxes)";
					break;
			}
		}

		if (typeWhere !== "") {
			theWhere += typeWhere + " and ";
		}
		if (dateWhere !== "") {
			theWhere += dateWhere + " and ";
		}
		if (opWhere !== "") {
			theWhere += opWhere + " and ";
		}
		if (injWhere !== "") {
			theWhere += injWhere + " and ";
		}
		if (hrzWhere !== "") {
			theWhere += hrzWhere + " and ";
		}
		if (depthWhere !== "") {
			theWhere += depthWhere + " and ";
		}
		if (paperLogWhere !== "") {
			theWhere += paperLogWhere + " and ";
		}
		if (scanLogWhere !== "") {
			theWhere += scanLogWhere + " and ";
		}
		if (lasWhere !== "") {
			theWhere += lasWhere + " and ";
		}
		if (coreWhere !== "") {
			theWhere += coreWhere + " and ";
		}
		if (cuttingsWhere !== "") {
			theWhere += cuttingsWhere + " and ";
		}
		if (theWhere.substr(theWhere.length - 5) === " and ") {
			theWhere = theWhere.slice(0,theWhere.length - 5);
		}
		
		def[0] = theWhere;
		idDef[0] = def[0];
		wellsLayer.layerDefinitions = def;
	}


	clearOgFilter = function() {
		dom.byId("operators").value = "";
		$(".og-input").val("");
		$('input[name="og-has"]').removeAttr("checked");
		$('select.og-select option').removeAttr("selected");
		dom.byId("hrz").checked = false;
		wellsLayer.layerDefinitions = [];
		idDef[0] = "";
	}


	filterWWC5 = function() {
		var def = [];
		var theWhere = "";
		var dateWhere = "";
		var statusWhere = "";
		var useWhere = "";
		var conStatus = $('input[name="const-status"]:checked').map(function() {
		    return this.value;
		} ).get();
		var wellUse = $("#well-use").val();
		var wwc5FromDate = dom.byId("wwc5-from-date").value;
		var wwc5ToDate = dom.byId("wwc5-to-date").value;

		if (wwc5FromDate && wwc5ToDate) {
			dateWhere = "completion_date >= to_date('" + wwc5FromDate + "','mm/dd/yyyy') and completion_date < to_date('" + wwc5ToDate + "','mm/dd/yyyy') + 1";
		} else if (wwc5FromDate && !wwc5ToDate) {
			dateWhere = "completion_date >= to_date('" + wwc5FromDate + "','mm/dd/yyyy')";
		} else if (!wwc5FromDate && wwc5ToDate) {
			dateWhere = "completion_date < to_date('" + wwc5ToDate + "','mm/dd/yyyy') + 1";
		}

		if (conStatus.length > 0) {
			var conList = "'" + conStatus.join("','") + "'";
			statusWhere = "status in (" + conList +")";
		}

		if (wellUse) {
			var useList = "'" + wellUse.join("','") + "'";
			useWhere = "use_desc in (" + useList +")";
		}

		if (dateWhere !== "") {
			theWhere += dateWhere + " and ";
		}
		if (statusWhere !== "") {
			theWhere += statusWhere + " and ";
		}
		if (useWhere !== "") {
			theWhere += useWhere;
		}
		if (theWhere.substr(theWhere.length - 5) === " and ") {
			theWhere = theWhere.slice(0,theWhere.length - 5);
		}

		def[8] = theWhere;
		idDef[8] = def[8];
		wwc5Layer.layerDefinitions = def;
	}


	clearwwc5F = function() {
		dom.byId("wwc5-from-date").value = "";
        dom.byId("wwc5-to-date").value = "";
		$('input[name="const-status"]').removeAttr("checked");
		$('select#well-use option').removeAttr("selected");
		wwc5Layer.layerDefinitions = [];
		idDef[8] = "";
	}


    filterQuakes = function(btn) {
        var def = [];
        var lMag, uMag;
        if (btn === "day-btn") {
            lMag = dom.byId("day-mag").value;
            uMag = parseInt(lMag) + 0.99;
			var fromDate = dom.byId('eq-from-date').value;
			var toDate = dom.byId('eq-to-date').value;
			var fromWhr = "central_standard_time >= to_date('" + fromDate + "','mm/dd/yyyy')";
			var toWhr = "central_standard_time < to_date('" + toDate + "','mm/dd/yyyy') + 1";
			var netWhr = " and net in ('us', ' ', 'US')";

            if (lMag !== "all") {
				if (fromDate && toDate) {
                	def[13] = fromWhr + " and " + toWhr + " and mag >= " + lMag + " and mag <= " + uMag + netWhr;
				} else if (fromDate && !toDate) {
					def[13] = fromWhr + " and mag >= " + lMag + " and mag <= " + uMag + netWhr;
				} else if (!fromDate && toDate) {
					def[13] = toWhr + " and mag >= " + lMag + " and mag <= " + uMag + netWhr;
				}
            } else {
				if (fromDate && toDate) {
                	def[13] = fromWhr + " and " + toWhr + netWhr;
				} else if (fromDate && !toDate) {
					def[13] = fromWhr + netWhr;
				} else if (!fromDate && toDate) {
					def[13] = toWhr + netWhr;
				}
            }
        } else {
            var year = dom.byId("year").value;
            var nextYear = parseInt(year) + 1;

            lMag = dom.byId("year-mag").value;
            uMag = parseInt(lMag) + 0.99;

            if (year !== "all") {
				var whr = "central_standard_time >= to_date('01/01/" + year + "','mm/dd/yyyy') and central_standard_time < to_date('01/01/" + nextYear + "','mm/dd/yyyy') and net in ('us', ' ', 'US')";
                if (lMag !== "all") {
                    def[13] = whr + " and mag >= " + lMag + " and mag <= " + uMag;
                } else {
                    def[13] = whr;
                }
            } else {
                if (lMag !== "all") {
                    def[13] = " mag >= " + lMag + " and mag <= " + uMag;
                } else {
                    def[13] = "";
                }
            }
        }
		idDef[13] = def[13];
        usgsEventsLayer.layerDefinitions = def;
    }


    clearQuakeFilter = function() {
        usgsEventsLayer.layerDefinitions = [];
        dom.byId("year").options[0].selected="selected";
        dom.byId("year-mag").options[0].selected="selected";
        dom.byId("day-mag").options[0].selected="selected";
        dom.byId("eq-from-date").value = "";
        dom.byId("eq-to-date").value = "";
		idDef[13] = "";
    }


    filterQuakesLast = function() {
        var def = [];
        def[13] = "state = 'KS' and net in ('us', ' ', 'US') and the_date = (select max(the_date) from earthquakes where state = 'KS' and net in ('us', ' ', 'US'))";
		idDef[13] = def[13];
		usgsEventsLayer.layerDefinitions = def;
    }


    function findWell(kid) {
        findParams.layerIds = [0];
        findParams.searchFields = ["KID"];
        findParams.searchText = kid;
        findParams.returnGeometry = true;
        findTask.execute(findParams)
            .then(function(response) {
                return arrayUtils.map(response, function(result) {
                    var feature = result.feature;
                        var t = new PopupTemplate( {
                            title: "<span class='pu-title'>Well: " + feature.attributes.LEASE_NAME + " " + feature.attributes.WELL_NAME + "  </span><span class='pu-note'>(" + feature.attributes.API_NUMBER + ")</span>",
                            content: wellContent(feature)
                        } );
                        feature.popupTemplate = t;

                    return feature;
              } );
            } )
            .then(function(feature) {
                openPopup(feature);
                zoomToFeature(feature);
            } );
    }


    function openPopup(feature) {
        view.popup.viewModel.features = feature;
        view.popup.viewModel.docked = true;
        view.popup.viewModel.visible = true;
        dom.byId("mapDiv").style.cursor = "auto";
    }


    function urlZoom(urlParams) {
        var items = urlParams.split("&");
        if (items.length > 1) {
            var extType = items[0].substring(11);
            var extValue = items[1].substring(12);

            findParams.returnGeometry = true;
            findParams.contains = false;

            switch (extType) {
                case "well":
                    findParams.layerIds = [0];
                    findParams.searchFields = ["kid"];
                    break;
                case "field":
                    findParams.layerIds = [1];
                    findParams.searchFields = ["field_kid"];
                    break;
            }

            findParams.searchText = extValue;
            findTask.execute(findParams)
            .then(function(response) {
                return arrayUtils.map(response, function(result) {
                    var feature = result.feature;
                    var layerName = result.layerName;

                    if (layerName === 'OG_WELLS') {
                        var ogWellsTemplate = new PopupTemplate( {
                            title: "<span class='pu-title'>Well: {WELL_LABEL} </span><span class='pu-note'>({API_NUMBER})</span>",
                            content: wellContent(feature)
                        } );
                        feature.popupTemplate = ogWellsTemplate;
                    }
                    else if (layerName === 'OG_FIELDS') {
                        var ogFieldsTemplate = new PopupTemplate( {
                            title: "Field: {FIELD_NAME}",
                            content: fieldContent(feature)
                            } );
                        feature.popupTemplate = ogFieldsTemplate;
                    }

                    return feature;
              } );
            } )
            .then(function(feature) {
                openPopup(feature);
                zoomToFeature(feature);
            } );

            // TODO: tie last location to the Home button?
        }
    }


    function zoomToFeature(features) {
        var f = features[0] ? features[0] : features;

        switch (f.geometry.type) {
            case "point":
                var x = f.geometry.x;
                var y = f.geometry.y;
                var point = new Point(x, y, new SpatialReference( { wkid: 3857 } ) );
                view.center = point;
                view.scale = 24000;
                //highlightFeature(feature);
                break;
            case "polygon":
                var ext = f.geometry.extent;
                view.extent = ext;
                break;
        }
    }


    function highlightFeature(features) {
        var f = features[0] ? features[0] : features;

        switch (f.geometry.type) {
            case "point":
                var x = f.geometry.x;
                var y = f.geometry.y;
                var point = new Point(x, y, new SpatialReference( { wkid: 3857 } ) );
                markerSymbol = new SimpleMarkerSymbol( {
                    color: [255, 255, 0, 0],
                    size: 20,
                    outline: new SimpleLineSymbol( {
                        color: "yellow",
                        width: 8
                    } )
                  } );

                var pointGraphic = new Graphic( {
                    geometry: point,
                    symbol: markerSymbol
                } );

                graphicsLayer.add(pointGraphic);
                break;
            case "polygon":
                var ext = features[0].geometry.extent;
                view.extent = ext;
                break;
        }
    }


    jumpFocus = function(nextField,chars,currField) {
        if (dom.byId(currField).value.length == chars) {
            dom.byId(nextField).focus();
        }
    }


    findIt = function(what) {
        findParams.returnGeometry = true;

        switch (what) {
            case "plss":
                var plssText;

                if (dom.byId('rngdir-e').checked == true) {
                    var dir = 'E';
                }
                else {
                    var dir = 'W';
                }

                if (dom.byId('sec').value !== "") {
                    plssText = 'S' + dom.byId('sec').value + '-T' + dom.byId('twn').value + 'S-R' + dom.byId('rng').value + dir;
                    findParams.layerIds = [3];
                    findParams.searchFields = ["s_r_t"];
                }
                else {
                    plssText = 'T' + dom.byId('twn').value + 'S-R' + dom.byId('rng').value + dir;
                    findParams.layerIds = [4];
                    findParams.searchFields = ["t_r"];
                }
                findParams.searchText = plssText;
                break;
            case "api":
                var apiText = dom.byId('api_state').value + "-" + dom.byId('api_county').value + "-" + dom.byId('api_number').value;

                if (dom.byId('api_extension').value != "") {
                    apiText = apiText + "-" + dom.byId('api_extension').value;
                }
                findParams.layerIds = [0];
                findParams.searchFields = ["api_number"];
                findParams.searchText = apiText;
                break;
            case "county":
                findParams.layerIds = [2];
                findParams.searchFields = ["county"];
                findParams.searchText = dom.byId("lstCounty").value;
                break;
            case "field":
                findParams.layerIds = [1];
                findParams.searchFields = ["field_name"];
                findParams.contains = false;
                findParams.searchText = dom.byId("field-select").value;
                if (!fieldsLayer.visible) {
                    fieldsLayer.visible = true;
                    $("#Oil-and-Gas-Fields input").prop("checked", true);
                }
        }
        findTask.execute(findParams).then(function(response) {
            zoomToFeature(response[0].feature);
        } );
    }


    zoomToLatLong = function() {
        var lat = dom.byId("lat").value;
        var lon = dom.byId("lon").value;
        var datum = dom.byId("datum").value;

        var gsvc = new GeometryService("http://services.kgs.ku.edu/arcgis2/rest/services/Utilities/Geometry/GeometryServer");
        var params = new ProjectParameters();
        var wgs84Sr = new SpatialReference( { wkid: 4326 } );

        if (lon > 0) {
            lon = 0 - lon;
        }

        var srId = (datum === "nad27") ? 4267 : 4326;

        var p = new Point(lon, lat, new SpatialReference( { wkid: srId } ) );
        params.geometries = [p];
        params.outSR = wgs84Sr;

        gsvc.project(params).then( function(features) {
            var pt84 = new Point(features[0].x, features[0].y, wgs84Sr);
            var wmPt = webMercatorUtils.geographicToWebMercator(pt84);

            view.center = wmPt;
            view.zoom = 16;

            var ptSymbol = new SimpleMarkerSymbol( {
                style: "x",
                size: 22,
                outline: new SimpleLineSymbol( {
                  color: [255, 0, 0],
                  width: 4
                } )
            } );

            var pointGraphic = new Graphic( {
                geometry: wmPt,
                symbol: ptSymbol
            } );

            graphicsLayer.clear();
            graphicsLayer.add(pointGraphic);
            // FIXME: Possible api bug here. Point graphic appears huge on the map at first but displays correctly after the map extent changes in some way.
            // It works corrrectly on subsequent passes (after extent has been changed).
            // Adding a new graphics layer every time makes it work correctly, but the layers pile up. either wait on 4.0 final release and test, or
            // test for existence of second graphics layer and remove it.
        } );
    }


    function createMenus() {
    	var drawerMenus = [];
        var content, menuObj;

        // Find panel:
        content = '';
        content += '<div class="panel-container">';
        content += '<div class="panel-header">Find <span class="esri-icon-erase" title="Clear Graphics & Highlights"></span></div>';
        content += '<div class="panel-padding">';
        // address:
        content += '<div class="find-header esri-icon-right-triangle-arrow" id="address"> Address or Place</div>';
        content += '<div class="find-body hide" id="find-address">';
        content += '<div id="srch"></div>';
        content += '</div>';
        // plss:
        content += '<div class="find-header esri-icon-right-triangle-arrow" id="plss"> Section-Township-Range</div>';
        content += '<div class="find-body hide" id="find-plss">';
        content += '<table><tr><td class="find-label">Township:</td><td><select id="twn"><option value=""></option>';
        for (var i=1; i<36; i++) {
            content += '<option value="' + i + '"">' + i + '</option>';
        }
        content += '</select> South</td></tr>';
        content += '<tr><td class="find-label">Range:</td><td><select id="rng"><option value=""></option>';
        for (var i=1; i<44; i++) {
            content += '<option value="' + i + '"">' + i + '</option>';
        }
        content += '</select> East: <input type="radio" name="rngdir" id="rngdir-e" value="e"> West: <input type="radio" name="rngdir" id="rngdir-w" value="w" checked></td></tr>';
        content += '<tr><td class="find-label">Section:</td><td><select id="sec"><option value=""></option>';
        for (var i=1; i<37; i++) {
            content += '<option value="' + i + '"">' + i + '</option>';
        }
        content += '</select></td></tr>';
        content += '<tr><td></td><td><button class=find-button onclick=findIt("plss")>Find</button></td></tr>';
        content += '</table></div>';
        // api:
        content += '<div class="find-header esri-icon-right-triangle-arrow" id="api"> Well API</div>';
        content += '<div class="find-body hide" id="find-api">';
        content += 'API Number (extension optional):<br>';
        content += '<input type="text" id="api_state" size="2" onKeyUp="jumpFocus(api_county, 2, this.id)"/> - ';
        content += '<input type="text" id="api_county" size="3" onKeyUp="jumpFocus(api_number, 3, this.id)"/> - ';
        content += '<input type="text" id="api_number" size="5" onKeyUp="jumpFocus(api_extension, 5, this.id)"/> - ';
        content += '<input type="text" id="api_extension" size="4"/>';
        content += '<button class=find-button onclick=findIt("api")>Find</button>';
        content += '</div>';
        // lat-lon:
        content += '<div class="find-header esri-icon-right-triangle-arrow" id="latlon"> Latitude-Longitude</div>';
        content += '<div class="find-body hide" id="find-latlon">';
        content += '<table><tr><td class="find-label">Latitude:</td><td><input type="text" id="lat" placeholder="e.g. 38.12345"></td></tr>';
        content += '<tr><td class="find-label">Longitude:</td><td><input type="text" id="lon" placeholder="e.g. -98.12345"></td></tr>';
        content += '<tr><td class="find-label">Datum:</td><td><select id="datum"><option value="nad27">NAD27</option><option value="wgs84">WGS84</option><td></td></tr>';
        content += '<tr><td></td><td><button class="find-button" onclick="zoomToLatLong();">Find</button></td></tr>';
        content += '</table></div>';
        // field:
        content += '<div class="find-header esri-icon-right-triangle-arrow" id="field"> Field</div>';
        content += '<div class="find-body hide" id="find-field">';
        content += '<table><tr><td class="find-label">Name:</td><td><input id="field-select"></td><td><button class=find-button onclick=findIt("field")>Find</button></td></tr></table>';
        content += '</div>';
        // county:
        content += '<div class="find-header esri-icon-right-triangle-arrow" id="county"> County</div>';
        content += '<div class="find-body hide" id="find-county">';
        content += '<table><tr><td class="find-label">County:</td><td><select id="lstCounty"></select></td><td><button class=find-button onclick=findIt("county")>Find</button></td></tr></table>';
        content += '</div>';

        content += '</div>';
        content += '</div>';

        menuObj = {
            label: '<div class="icon-zoom-in"></div><div class="icon-text">Find</div>',
            content: content
        };
        drawerMenus.push(menuObj);

        // Layers panel:
        content = '';
        content += '<div class="panel-container">';
        content += '<div class="panel-header">Layers* <span class="esri-icon-erase" title="Clear Graphics & Highlights"></span></div>';
        content += '<div id="lyrs-toc"></div>';
        content += '</div>';

        menuObj = {
            label: '<div class="icon-layers"></div><div class="icon-text">Layers</div>',
            content: content
        };
        drawerMenus.push(menuObj);

        // Legend panel:
        content = '';
        content += '<div class="panel-container">';
        content += '<div class="panel-header">Legend <span class="esri-icon-erase" title="Clear Graphics & Highlights"></span></div>';
        content += '<div class="panel-padding">';
        content += '<div id="legend-content"></div>';
        content += '</div>';
        content += '</div>';

        menuObj = {
            label: '<div class="icon-list"></div><div class="icon-text">Legend</div>',
            content: content
        };
        drawerMenus.push(menuObj);

        // Tools panel:
        content = '';
        content += '<div class="panel-container">';
        content += '<div class="panel-header">Tools <span class="esri-icon-erase" title="Clear Graphics & Highlights"></span></div>';
        content += '<div class="panel-padding">';
        content += '<div id="tools-content"></div>';
        content += '</div>';
        content += '</div>';

        menuObj = {
            label: '<div class="icon-wrench"></div><div class="icon-text">Tools</div>',
            content: content
        };
        drawerMenus.push(menuObj);

        var drawerMenu = new DrawerMenu({
            menus: drawerMenus
        }, dom.byId("drawer_menus"));
        drawerMenu.startup();
    }


    function showFullInfo() {
        var popupTitle = $(".esri-title").html();

        if (popupTitle.indexOf("Field:") > -1) {
            var fieldKID = $("#field-kid").html();
            var win = window.open("http://chasm.kgs.ku.edu/apex/oil.ogf4.IDProdQuery?FieldNumber=" + fieldKID, "target='_blank'");
        } else if (popupTitle.indexOf("Well:") > -1) {
            var wellKID = $("#well-kid").html();
            var win = window.open("http://chasm.kgs.ku.edu/apex/qualified.well_page.DisplayWell?f_kid=" + wellKID, "target='_blank'");
        } else if (popupTitle.indexOf("Earthquake") > -1) {
            var usgsID = $("#usgs-id").html();
            var win = window.open("http://earthquake.usgs.gov/earthquakes/eventpage/" + usgsID, "target='_blank'");
        } else if (popupTitle.indexOf("(WWC5)") > -1) {
            var wwc5ID = $("#seq-num").html();
            var win = window.open("http://chasm.kgs.ku.edu/ords/wwc5.wwc5d2.well_details?well_id=" + wwc5ID, "target='_blank'");
        }
    }


    function createTOC() {
        var lyrs = map.layers;
        var chkd, tocContent = "";
        var transparentLayers = ["Oil and Gas Fields","Topography","2014 Aerials","2002 Aerials","1991 Aerials"];

        for (var j=lyrs.length - 1; j>-1; j--) {
            var layerID = lyrs._items[j].id;
            chkd = map.getLayer(layerID).visible ? "checked" : "";
            if (layerID.indexOf("-layer-") === -1) {
                // ^ Excludes default graphics layer from the TOC.
                var htmlID = layerID.replace(/ /g, "-");
                tocContent += "<div class='toc-item' id='" + htmlID + "'><label><input type='checkbox' id='tcb-" + j + "' onclick='toggleLayer(" + j + ");'" + chkd + ">" + layerID + "</label>";

                if ($.inArray(layerID, transparentLayers) !== -1) {
                    // Add transparency control buttons to specified layers.
                    tocContent += "</span><span class='esri-icon-forward toc-icon' title='Make Layer Opaque' onclick='changeOpacity(&quot;" + layerID + "&quot;,&quot;up&quot;);'></span><span class='esri-icon-reverse toc-icon' title='Make Layer Transparent' onclick='changeOpacity(&quot;" + layerID + "&quot;,&quot;down&quot;);'>";
                }
                tocContent += "</div>";
            }
        }
        tocContent += "<span class='toc-note'>* Some layers only visible when zoomed in</span>";
        $("#lyrs-toc").html(tocContent);

        // Add addtional layer-specific controls and content (reference by hyphenated layer id):
        $("#Oil-and-Gas-Wells").append("</span><span class='esri-icon-filter toc-icon' onclick='$( &quot;#og-filter&quot; ).dialog( &quot;open&quot; );' title='Filter Wells'></span><span class='esri-icon-labels toc-icon' onclick='labelWells(&quot;og&quot;);' title='Label Wells'>");
        $("#WWC5-Water-Wells").append("<span class='esri-icon-filter toc-icon' onclick='$( &quot;#wwc5-filter&quot; ).dialog( &quot;open&quot; );' title='Filter Wells'></span><span class='esri-icon-labels toc-icon' onclick='labelWells(&quot;wwc5&quot;);' title='Label Wells'></span>");

        var eventDesc = "Data for all events occurring between 1/9/2013 and 3/7/2014 was provided by the Oklahoma Geological Survey - all other data is from the USGS.</p>";
        eventDesc += "<p>Earthquake data for Oklahoma is incomplete and only extends back to 12/2/2014. Only events occurring in northern Oklahoma<br>(north of Medford) are included on the mapper.</p>";
        $("#Earthquakes").append("<span class='esri-icon-filter toc-icon' onclick='$( &quot;#eq-filter&quot; ).dialog( &quot;open&quot; );' title='Filter Earthquakes'></span><span class='esri-icon-description toc-icon' id='event-desc-icon'></span><span class='tooltip hide' id='event-desc'>" + eventDesc + "</span>");
        $("#event-desc-icon").click(function() {
            $("#event-desc").toggleClass("show");
        } );

        var lepcDesc = "<p>The Lesser Prairie Chicken (LEPC) Crucial Habitat map layer is part of the Southern Great Plains Crucial Habitat Assessment Tool (SGP CHAT), produced and maintained";
        lepcDesc += "by the Kansas Biological Survey. For more information, including inquiries, please visit the <a href='http://kars.ku.edu/geodata/maps/sgpchat' target='_blank'>project website</a>.</p>";
        lepcDesc += "<p>SGP CHAT is intended to provide useful and non-regulatory information during the early planning stages of development projects, conservation opportunities, and environmental review.</p>";
        lepcDesc += "<p>SGP CHAT is not intended to replace consultation with local, state, or federal agencies.</p>";
        lepcDesc += "<p>The finest data resolution is one square mile hexagons, and use of this data layer at a more localized scale is not appropriate and may lead to inaccurate interpretations.";
        lepcDesc += "The classification may or may not apply to the entire section. Consult with local biologists for more localized information.</p>";
        $("#LEPC-Crucial-Habitat").append("<span class='esri-icon-description toc-icon' id='lepc-desc-icon'></span><span class='tooltip hide' id='lepc-desc'>" + lepcDesc + "</span>");
        $("#lepc-desc-icon").click(function() {
            $("#lepc-desc").toggleClass("show");
        } );
    }


    labelWells = function(type) {
        // TODO:
        console.log("label wells function");
    }


    changeOpacity = function(id, dir) {
        var lyr = map.getLayer(id);
        var incr = (dir === "down") ? -0.2 : 0.2;
        lyr.opacity = lyr.opacity + incr;
    }


    function createTools() {
        // TODO: below is just a test.
        var content = "";
        content += '<span id="junktest">1006116441</span>';
        $("#tools-content").html(content);
    }


    function executeIdTask(event) {
        identifyParams.geometry = event.mapPoint;
        identifyParams.mapExtent = view.extent;
		identifyParams.layerDefinitions = idDef;
        dom.byId("mapDiv").style.cursor = "wait";

        identifyTask.execute(identifyParams).then(function(response) {
            return arrayUtils.map(response, function(result) {
                var feature = result.feature;
                var layerName = result.layerName;

                if (layerName === 'OG_WELLS') {
                    var ogWellsTemplate = new PopupTemplate( {
                        title: "<span class='pu-title'>Well: {WELL_LABEL} </span><span class='pu-note'>{API_NUMBER}</span>",
                        content: wellContent(feature)
                    } );
                    feature.popupTemplate = ogWellsTemplate;
                }
                else if (layerName === 'OG_FIELDS') {
                    var ogFieldsTemplate = new PopupTemplate( {
                        title: "Field: {FIELD_NAME}",
                        content: fieldContent(feature)
                        } );
                    feature.popupTemplate = ogFieldsTemplate;
                }
                else if (layerName === 'WWC5_WELLS') {
                    var wwc5Template = new PopupTemplate( {
                        title: "Water Well (WWC5): ",
                        content: wwc5Content(feature)
                    } );
                    feature.popupTemplate = wwc5Template;
                }
                else if (layerName === 'EARTHQUAKES') {
                    var earthquakeTemplate = new PopupTemplate( {
                        title: "Earthquake Event: ",
                        content: earthquakeContent(feature)
                    } );
                    feature.popupTemplate = earthquakeTemplate;
                }

                return feature;
          } );
        } ).then(function(feature) {
            openPopup(feature);
            //highlightFeature(feature);
        } );
    }


    function earthquakeContent(feature) {
        var date = feature.attributes.CENTRAL_STANDARD_TIME !== "Null" ? feature.attributes.CENTRAL_STANDARD_TIME : "";
        var content = "<table cellpadding='4'><tr><td>Magnitude: </td><td>{MAG}</td></tr>";
        content += "<tr><td>Date/Time (CST): </td><td>" + date + "</td></tr>";
        content += "<tr><td>Latitude: </td><td>{LATITUDE}</td></tr>";
        content += "<tr><td>Longitude: </td><td>{LONGITUDE}</td></tr>";
        content += "<tr><td>Depth: </td><td>{DEPTH} km</td></tr>";
        content += "<tr><td>Magnitude Type: </td><td>{MAGTYPE}</td></tr>";
        content += "<tr><td>Data Source: </td><td>{SOURCE}</td></tr>";
        content += "<span id='usgs-id' class='hide'>{ID}</span></table>";

        return content;
    }


    function wwc5Content(feature) {
        var content = "<table cellpadding='4'><tr><td>County:</td><td>{COUNTY}</td></tr>";
        content += "<tr><td>Section:</td><td>T{TOWNSHIP}S&nbsp;&nbsp;R{RANGE}{RANGE_DIRECTION}&nbsp;&nbsp;Sec {SECTION}</td></tr>";
        content += "<tr><td>Quarter Section:</td><td>{QUARTER_CALL_3}&nbsp;&nbsp;{QUARTER_CALL_2}&nbsp;&nbsp;{QUARTER_CALL_1_LARGEST}</td></tr>";
		content += "<tr><td>Latitude, Longitude (NAD27):</td><td>{NAD27_LATITUDE},&nbsp;&nbsp;{NAD27_LONGITUDE}</td></tr>";
		content += "<tr><td>Owner:</td><td>{OWNER_NAME}</td></tr>";
        content += "<tr><td>Status:</td><td>{STATUS}</td></tr>";
        content += "<tr><td>Depth (ft):</td><td>{DEPTH_TXT}</td></tr>";
        content += "<tr><td>Static Water Level (ft):</td><td>{STATIC_LEVEL_TXT}</td></tr>";
        content += "<tr><td>Estimated Yield (gpm):</td><td>{YIELD_TXT}</td></tr>";
        content += "<tr><td>Elevation (ft):</td><td>{ELEV_TXT}</td></tr>";
        content += "<tr><td>Use:</td><td style='white-space:normal'>{USE_DESC}</td></tr>";
        content += "<tr><td>Completion Date:</td><td>{COMP_DATE_TXT}</td></tr>";
        content += "<tr><td>Driller:</td><td style='white-space:normal'>{CONTRACTOR}</td></tr>";
        content += "<tr><td>DWR Application Number:</td><td>{DWR_APPROPRIATION_NUMBER}</td></tr>";
        content += "<tr><td>Other ID:</td><td>{MONITORING_NUMBER}</td></tr>";
        content += "<tr><td>KGS Record Number:</td><td id='seq-num'>{INPUT_SEQ_NUMBER}</td></tr></table>";

        return content;
    }


    function fieldContent(feature) {
        var f = feature.attributes;
        var po = f.PROD_OIL !== "Null" ? f.PROD_OIL : "";
        var co = f.CUMM_OIL !== "Null" ? f.CUMM_OIL.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") : "";
        var pg = f.PROD_GAS !== "Null" ? f.PROD_GAS : "";
        var cg = f.CUMM_GAS !== "Null" ? f.CUMM_GAS.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") : "";
        var ac = f.APPROXACRE !== "Null" ? f.APPROXACRE.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") : "";
        var frm = f.FORMATIONS.split(",");
        var pf = "";
        for (var i=0; i<frm.length; i++) {
            pf += frm[i] + "<br>";
        }

        var content = "<table cellpadding='4'><tr><td>Type of Field:</td><td>{FIELD_TYPE}</td></tr>";
        content += "<tr><td>Status:</td><td>{STATUS}</td></tr>";
        content += "<tr><td>Produces Oil:</td><td>" + po + "</td></tr>";
        content += "<tr><td>Cumulative Oil (bbls):</td><td>" + co + "</td></tr>";
        content += "<tr><td>Produces Gas:</td><td>" + pg + "</td></tr>";
        content += "<tr><td>Cumulative Gas (mcf):</td><td>" + cg + "</td></tr>";
        content += "<tr><td>Approximate Acres:</td><td>" + ac + "</td></tr>";
        content += "<tr><td>Producing Formations:</td><td>" + pf + "</td></tr>";
        content += "<span id='field-kid' class='hide'>{FIELD_KID}</span></table>";

        return content;
    }


    function wellContent(feature) {
        var f = feature.attributes;
        var dpth = f.ROTARY_TOTAL_DEPTH !== "Null" ? f.ROTARY_TOTAL_DEPTH.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") : "";
        var elev = f.ELEVATION_KB !== "Null" ? f.ELEVATION_KB.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") : "";

        var content = "<table cellpadding='3'><tr><td>API:</td><td>{API_NUMBER}</td></tr>";
        content += "<tr><td>Current Operator:</td><td>{CURR_OPERATOR}</td></tr>";
        content += "<tr><td>Well Type:</td><td>{STATUS_TXT}</td></tr>";
        content += "<tr><td>Status:</td><td>{WELL_CLASS}</td></tr>";
        content += "<tr><td>Lease:</td><td>{LEASE_NAME}</td></tr>";
        content += "<tr><td>Well:</td><td>{WELL_NAME}</td></tr>";
        content += "<tr><td>Field:</td><td>{FIELD_NAME}</td></tr>";
        content += "<tr><td>Location:</td><td>T{TOWNSHIP}S&nbsp;&nbsp;R{RANGE}{RANGE_DIRECTION}&nbsp;&nbsp;Sec {SECTION}<br>{SPOT}&nbsp;{SUBDIVISION_4_SMALLEST}&nbsp;{SUBDIVISION_3}&nbsp;{SUBDIVISION_2}&nbsp;{SUBDIVISION_1_LARGEST}</td></tr>";
        content += "<tr><td>Latitude, Longitude (NAD27):</td><td>{NAD27_LATITUDE},&nbsp;&nbsp;{NAD27_LONGITUDE}</td></tr>";
        content += "<tr><td>County:</td><td>{COUNTY}</td></tr>";
        content += "<tr><td>Permit Date:</td><td>{PERMIT_DATE_TXT}</td></tr>";
        content += "<tr><td>Spud Date:</td><td>{SPUD_DATE_TXT}</td></tr>";
        content += "<tr><td>Completion Date:</td><td>{COMPLETION_DATE_TXT}</td></tr>";
        content += "<tr><td>Plug Date:</td><td>{PLUG_DATE_TXT}</td></tr>";
        content += "<tr><td>Total Depth (ft):</td><td>" + dpth + "</td></tr>";
        content += "<tr><td>Elevation (KB, ft):</td><td>" + elev + "</td></tr>";
        content += "<tr><td>Producing Formation:</td><td>{PRODUCING_FORMATION}</td></tr>";
        content += "<span id='well-kid' class='hide'>{KID}</span></table>";

        return content;
    }


    toggleLayer = function(j) {
        var l = map.getLayer(map.layers._items[j].id);
        l.visible = $("#tcb-" + j).is(":checked") ? true : false;
    }

} );
