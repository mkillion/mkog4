require([
	"dojo/_base/lang",
	"dojo/on",
	"dojo/dom",
    "dojo/window",
    "dojo/_base/array",
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
    "dojo/domReady!"
],
function(
	lang,
	on,
	dom,
    win,
    arrayUtils,
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
    IdentifyParameters
) {
    // Set up basic frame:
    window.document.title = "FooBar";
    $("#title").html("Kansas Oil and Gas<a id='kgs-brand' href='http://www.kgs.ku.edu'>Kansas Geological Survey</a>");

    var showDrawerSize = 850;

	var drawer = new Drawer({
        showDrawerSize: showDrawerSize,
        borderContainer: 'bc_outer',
        contentPaneCenter: 'cp_outer_center',
        contentPaneSide: 'cp_outer_left',
        toggleButton: 'hamburger_button'
    });
    drawer.startup();

    // Broke the template drawer open/close behavior when paring down the code, so...
    $("#hamburger_button").click(function(e) {
        e.preventDefault();
        if ($("#cp_outer_left").css("width") === "280px") {
            $("#cp_outer_left").css("width", "0px");
        } else {
            $("#cp_outer_left").css("width", "280px");
        }
    } );

    createMenus();
    // End framework.

    // Create map and map widgets:
    var identifyTask, params;
    var ogGeneralServiceURL = "http://services.kgs.ku.edu/arcgis2/rest/services/oilgas/oilgas_general/MapServer";

    var basemapLayer = new ArcGISTiledLayer( {url:"http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer", id:"Base Map"} );
    var fieldsLayer = new ArcGISTiledLayer( {url:"http://services.kgs.ku.edu/arcgis2/rest/services/oilgas/oilgas_fields/MapServer", id:"Oil and Gas Fields"} );
    var wellsLayer = new ArcGISDynamicLayer( {url:ogGeneralServiceURL, visibleLayers:[0], id:"Oil and Gas Wells"} );
    var plssLayer = new ArcGISTiledLayer( {url:"http://services.kgs.ku.edu/arcgis2/rest/services/plss/plss/MapServer", id:"Section-Township-Range"} );

    var map = new Map( {
        // Not defining basemap here for TOC toggle reasons.
        //basemap: "topo",
        layers: [basemapLayer, fieldsLayer, plssLayer, wellsLayer]
    } );
    map.then(createTOC, mapErr);

    var view = new MapView( {
        map: map,
        container: "mapDiv",
        center: [-98, 38],
        zoom: 7
    } );
    view.ui.components = ["zoom"];

    view.then(function() {
        on(view, "click", executeIdTask);

        identifyTask = new IdentifyTask(ogGeneralServiceURL);
        params = new IdentifyParameters();
        params.tolerance = 3;
        params.layerIds = [12, 0, 8, 1];
        params.layerOption = "visible";
        params.width = view.width;
        params.height = view.height;

        // Define additional popup actions:
        var fullInfoAction = {
            title: "Full Info",
            id: "full-info",
            className: "esri-icon-table"
        };
        view.popup.viewModel.actions.push(fullInfoAction);
        view.popup.viewModel.on("action-click", function(evt){
            if(evt.action.id === "full-info"){
                showFullInfo();
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
    }, "geocoderSearch");
    searchWidget.startup();

    $("#mobileGeocoderIconContainer").click(function() {
        $("#lb").toggleClass("small-search");
    } );

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

    // Don't display locate widget on larger devices:
    /*if (win.getBox().w > 1280) {
        locateBtn.set("visible", false);
    }*/

    // End map and map widgets.

    function createMenus() {
    	var drawerMenus = [];
        var content, menuObj;

        // Zoom-to panel:
        content = '';
        content += '<div class="panel-container">';
        content += '<div class="panel-header">Zoom To</div>';
        content += '<div class="panel-padding">';
        content += '<table width="90%" style="font-size:10px;">';
        content += '</div>';
        content += '</div>';

        menuObj = {
            label: '<div class="icon-zoom-in"></div><div class="icon-text">Zoom To</div>',
            content: content
        };
        drawerMenus.push(menuObj);

        // Layers panel:
        content = '';
        content += '<div class="panel-container">';
        content += '<div class="panel-header">Layers</div>';
        content += '<div>';
        content += '<div id="lyrs-toc"></div>';
        content += '</div>';
        content += '</div>';

        menuObj = {
            label: '<div class="icon-layers"></div><div class="icon-text">Layers</div>',
            content: content
        };
        drawerMenus.push(menuObj);

        // Legend panel:
        content = '';
        content += '<div class="panel-container">';
        content += '<div class="panel-header">Legend</div>';
        content += '<div class="panel-padding">';
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
        content += '<div class="panel-header">Tools</div>';
        content += '<div class="panel-padding">';
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
        }
    }


    function createTOC() {
        var lyrs = map.layers;
        var chkd, tocContent = "";

        for (var j=lyrs.length - 1; j>-1; j--) {
            chkd = map.getLayer(lyrs._items[j].id).visible ? "checked" : "";
            if (lyrs._items[j].id.indexOf("-layer-") === -1) {
                // Excludes default graphics layer from the TOC.
                tocContent += "<div class='toc-item'><label><input type='checkbox' id='tcb-" + j + "' onclick='toggleLayer(" + j + ");'" + chkd + ">" + lyrs._items[j].id + "</label></div>";
            }
        }
        $("#lyrs-toc").html(tocContent);
    }

    function executeIdTask(event) {
        params.geometry = event.mapPoint;
        params.mapExtent = view.extent;
        dom.byId("mapDiv").style.cursor = "wait";

        identifyTask.execute(params).then(function(response) {
            return arrayUtils.map(response, function(result) {
                var feature = result.feature;
                var layerName = result.layerName;

                // TODO - add "or RECENT_SPUDS" to ogwells block.
                if (layerName === 'OG_WELLS') {
                    var ogWellsTemplate = new PopupTemplate( {
                        title: "<span class='pu-title'>Well: {LEASE_NAME} {WELL_NAME} </span><span class='pu-note'>({API_NUMBER})</span>",
                        content: "<table><tr><td>Current Operator: </td><td>{CURR_OPERATOR}</td></tr>" +
                                "<tr><td>Well Type: </td><td>{STATUS_TXT}</td></tr>" +
                                "<tr><td>Status: </td><td>{WELL_CLASS}</td></tr>" +
                                "<tr><td>Lease: </td><td>{LEASE_NAME}</td></tr>" +
                                "<tr><td>Well: </td><td>{WELL_NAME}</td></tr>" +
                                "<tr><td>Field: </td><td>{FIELD_NAME}</td></tr>" +
                                "<tr><td>Location: </td><td>T{TOWNSHIP}S R{RANGE}{RANGE_DIRECTION} Sec {SECTION}<br>{SPOT} {SUBDIVISION_4_SMALLEST} {SUBDIVISION_3} {SUBDIVISION_2} {SUBDIVISION_1_LARGEST}</td></tr>" +
                                "<tr><td>Coordinates (NAD27): </td><td>{NAD27_LONGITUDE}, {NAD27_LATITUDE}</td></tr>" +
                                "<tr><td>County: </td><td>{COUNTY}</td></tr>" +
                                "<tr><td>Permit Date: </td><td>{PERMIT_DATE_TXT}</td></tr>" +
                                "<tr><td>Spud Date: </td><td>{SPUD_DATE_TXT}</td></tr>" +
                                "<tr><td>Completion Date: </td><td>{COMPLETION_DATE_TXT}</td></tr>" +
                                "<tr><td>Plug Date: </td><td>{PLUG_DATE_TXT}</td></tr>" +
                                "<tr><td>Total Depth (ft): </td><td>{ROTARY_TOTAL_DEPTH}</td></tr>" +
                                "<tr><td>Elevation (KB, ft): </td><td>{ELEVATION_KB}</td></tr>" +
                                "<tr><td>Producing Formation: </td><td>{PRODUCING_FORMATION}</td></tr>" +
                                "<span id='well-kid' class='no-display'>{KID}</span></table>",
                    } );
                    feature.popupTemplate = ogWellsTemplate;
                }
                else if (layerName === 'OG_FIELDS') {
                    var ogFieldsTemplate = new PopupTemplate( {
                        title: "Field: {FIELD_NAME}",
                        content: "<table><tr><td>Type of Field: </td><td>{FIELD_TYPE}</td></tr>" +
                                "<tr><td>Status: </td><td>{STATUS}</td></tr>" +
                                "<tr><td>Produces Oil: </td><td>{PROD_OIL}</td></tr>" +
                                "<tr><td>Cumulative Oil (bbls): </td><td>{CUMM_OIL}</td></tr>" +
                                "<tr><td>Produces Gas: </td><td>{PROD_GAS}</td></tr>" +
                                "<tr><td>Cumulative Gas (mcf): </td><td>{CUMM_GAS}</td></tr>" +
                                "<tr><td>Approximate Acres: </td><td>{APPROXACRE}</td></tr>" +
                                "<span id='field-kid' class='no-display'>{FIELD_KID}</span></table>",
                        fieldInfos: [
                            {
                                fieldName: "CUMM_OIL",
                                format: { digitSeparator: true, places: 0 }
                            },
                            {
                                fieldName: "CUMM_GAS",
                                format: { digitSeparator: true, places: 0 }
                            },
                            {
                                fieldName: "APPROXACRE",
                                format: { digitSeparator: true, places: 0 }
                            }
                        ]
                    } );
                    feature.popupTemplate = ogFieldsTemplate;
                }
                else if (layerName === 'WWC5_WELLS') {
                    var wwc5Template = new PopupTemplate( {
                        title: "Water Well: ",
                        content: wwc5Content(feature)
                    } );
                    feature.popupTemplate = wwc5Template;
                }
                return feature;
          } );
        } ).then(showPopup);

        function showPopup(response) {
            if (response.length > 0) {
                view.popup.viewModel.features = response;
                view.popup.viewModel.visible = true;
                view.popup.viewModel.location = event.mapPoint;
            }
            dom.byId("mapDiv").style.cursor = "auto";
        }
    }


    toggleLayer = function(j) {
        var l = map.getLayer(map.layers._items[j].id);
        l.visible = $("#tcb-" + j).is(":checked") ? true : false;
    }

} );
