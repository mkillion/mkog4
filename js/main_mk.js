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
        params.layerOption = "all";
        params.width = view.width;
        params.height = view.height;
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
                        title: "Well: {LEASE_NAME} " + "{WELL_NAME}",
                        content: getWellContent("{KID}")
                    } );
                    feature.popupTemplate = ogWellsTemplate;
                }
                else if (layerName === 'OG_FIELDS') {
                    var ogFieldsTemplate = new PopupTemplate( {
                        title: "Field: {FIELD_NAME}",
                        content: getFieldContent(feature)
                    } );
                    feature.popupTemplate = ogFieldsTemplate;
                }
                else if (layerName === 'WWC5_WELLS') {
                    var wwc5Template = new PopupTemplate( {
                        title: "Water Well",
                        content: getWWC5Content("{INPUT_SEQ_NUMBER}")
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

        function getFieldContent(feature) {
            var f = feature.attributes;
            var ftyp = f.FIELD_TYPE !== "Null" ? f.FIELD_TYPE : "";
            var sta = f.STATUS !== "Null" ? f.STATUS : "";
            var po = f.PROD_OIL !== "Null" ? f.PROD_OIL : "";
            var co = f.CUMM_OIL !== "Null" ? f.CUMM_OIL.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") : "";
            var pg = f.PROD_GAS !== "Null" ? f.PROD_GAS : "";
            var cg = f.CUMM_GAS !== "Null" ? f.CUMM_GAS.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") : "";
            var ac = f.APPROXACRE !== "Null" ? f.APPROXACRE.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") : "";
            var kid = f.FIELD_KID !== "Null" ? f.FIELD_KID : "";

            var content = "<table cellpadding='4'><tr><td>Type of Field: </td><td>" + ftyp + "</td></tr>";
            content += "<tr><td>Status: </td><td>" + sta + "</td></tr>";
            content += "<tr><td>Produces Oil: </td><td>" + po + "</td></tr>";
            content += "<tr><td>Cumulative Oil (bbls): </td><td>" + co + "</td></tr>";
            content += "<tr><td>Produces Gas: </td><td>" + pg + "</td></tr>";
            content += "<tr><td>Cumulative Gas (mcf): </td><td>" + cg + "</td></tr>";
            content += "<tr><td>Approximate Acres: </td><td>" + ac + "</td></tr>";
            content += "<tr><td colspan='2'><a href='http://chasm.kgs.ku.edu/apex/oil.ogf4.IDProdQuery?FieldNumber=" + kid + "' target='_blank'>Production Information</a></td></tr>";
            content += "</table>";

            return content;
        }

        function getWellContent(kid) {
            return kid;
        }

        function getWWC5Content(seqNum) {
            return seqNum;
        }
    }


    toggleLayer = function(j) {
        var l = map.getLayer(map.layers._items[j].id);
        l.visible = $("#tcb-" + j).is(":checked") ? true : false;
    }

} );
