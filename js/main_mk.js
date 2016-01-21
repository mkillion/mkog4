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
    "esri/tasks/FindTask",
    "esri/tasks/support/FindParameters",
    "esri/geometry/Point",
    "esri/geometry/SpatialReference",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/layers/GraphicsLayer",
    "esri/symbols/SimpleLineSymbol",
    "esri/Graphic",
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
    IdentifyParameters,
    FindTask,
    FindParameters,
    Point,
    SpatialReference,
    SimpleMarkerSymbol,
    GraphicsLayer,
    SimpleLineSymbol,
    Graphic
) {
    // TODO: review all comments.

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
        if ($("#cp_outer_left").css("width") === "300px") {
            $("#cp_outer_left").css("width", "0px");
        } else {
            $("#cp_outer_left").css("width", "300px");
        }
    } );

    createMenus();
    createTools();

    // End framework.

    // Create map and map widgets:
    var ogGeneralServiceURL = "http://services.kgs.ku.edu/arcgis2/rest/services/oilgas/oilgas_general/MapServer";
    var identifyTask, identifyParams;
    var findTask = new FindTask(ogGeneralServiceURL);
    var findParams = new FindParameters();

    var basemapLayer = new ArcGISTiledLayer( {url:"http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer", id:"Base Map"} );
    var fieldsLayer = new ArcGISDynamicLayer( {url:"http://services.kgs.ku.edu/arcgis2/rest/services/oilgas/oilgas_fields/MapServer", id:"Oil and Gas Fields"} );
    var wellsLayer = new ArcGISDynamicLayer( {url:ogGeneralServiceURL, visibleLayers:[0], id:"Oil and Gas Wells"} );
    var plssLayer = new ArcGISTiledLayer( {url:"http://services.kgs.ku.edu/arcgis2/rest/services/plss/plss/MapServer", id:"Section-Township-Range"} );

    var map = new Map( {
        // Not defining basemap here for TOC toggle reasons.
        //basemap: "topo",
        layers: [basemapLayer, fieldsLayer, plssLayer, wellsLayer]
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
        identifyParams.tolerance = 3;
        identifyParams.layerIds = [12, 0, 8, 1];
        identifyParams.layerOption = "visible";
        identifyParams.width = view.width;
        identifyParams.height = view.height;

        // Define additional popup actions:
        var fullInfoAction = {
            title: "Full Info",
            id: "full-info",
            className: "esri-icon-table"
        };
        view.popup.viewModel.actions.push(fullInfoAction);

        var bufferFeatureAction = {
            title: "Buffer Feature",
            id: "buffer-feature",
            className: "esri-icon-radio-checked"
        };
        view.popup.viewModel.actions.push(bufferFeatureAction);

        var reportErrorAction = {
            title: "Report Error",
            id: "report-error",
            className: "esri-icon-notice-triangle"
        };
        view.popup.viewModel.actions.push(reportErrorAction);

        view.popup.viewModel.on("action-click", function(evt){
            if(evt.action.id === "full-info") {
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

    urlZoom(location.search.substr(1));

    // TODO: following click function is only for testing opening a popup from a link; in future versions link would be a value in a table cell.
    $("#junktest").click(function() {
        var kid = $("#junktest").html();
        findWell(kid);
        // TODO: zoom to feature from side-panel link.
    } );


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

            // TODO: tie last location to the Home button? Put here or in zoomToFeature function.
            //lastLocType = extType;
            //lastLocValue = extValue;
        }
    }


    function zoomToFeature(feature) {
        var f = feature[0];
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
                var ext = feature[0].geometry.extent;
                view.extent = ext;
                break;
        }
    }


    function highlightFeature(feature) {
        var f = feature[0];
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
                var ext = feature[0].geometry.extent;
                view.extent = ext;
                break;
        }
    }


    function createMenus() {
    	var drawerMenus = [];
        var content, menuObj;

        // Find panel:
        content = '';
        content += '<div class="panel-container">';
        content += '<div class="panel-header">Find By:</div>';
        content += '<div class="panel-padding">';
        content += '<div id="find-content">';

        content += '<div id="srch"></div>';

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
        content += '<div class="panel-header">Layers</div>';
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
        content += '<div class="panel-header">Legend</div>';
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
        content += '<div class="panel-header">Tools</div>';
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


    function createTools() {
        var content = "";
        content += '<span id="junktest">1006116441</span>';
        $("#tools-content").html(content);
    }


    function executeIdTask(event) {
        identifyParams.geometry = event.mapPoint;
        identifyParams.mapExtent = view.extent;
        dom.byId("mapDiv").style.cursor = "wait";

        identifyTask.execute(identifyParams).then(function(response) {
            return arrayUtils.map(response, function(result) {
                var feature = result.feature;
                var layerName = result.layerName;

                // TODO - add "or RECENT_SPUDS" to ogwells block.
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
                else if (layerName === 'WWC5_WELLS') {
                    var wwc5Template = new PopupTemplate( {
                        title: "Water Well: ",
                        content: wwc5Content(feature)
                    } );
                    feature.popupTemplate = wwc5Template;
                }

                return feature;
          } );
        } ).then(function(feature) {
            openPopup(feature);
            //highlightFeature(feature);
        });
    }


    function fieldContent(feature) {
        var f = feature.attributes;
        var ftyp = f.FIELD_TYPE !== "Null" ? f.FIELD_TYPE : "";
        var sta = f.STATUS !== "Null" ? f.STATUS : "";
        var po = f.PROD_OIL !== "Null" ? f.PROD_OIL : "";
        var co = f.CUMM_OIL !== "Null" ? f.CUMM_OIL.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") : "";
        var pg = f.PROD_GAS !== "Null" ? f.PROD_GAS : "";
        var cg = f.CUMM_GAS !== "Null" ? f.CUMM_GAS.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") : "";
        var ac = f.APPROXACRE !== "Null" ? f.APPROXACRE.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") : "";
        var kid = f.FIELD_KID !== "Null" ? f.FIELD_KID : "";

        var frm = f.FORMATIONS.split(",");
        var pf = "";
        for (i=0; i<frm.length; i++) {
            pf += frm[i] + "<br>";
        }

        var content = "<table cellpadding='4'><tr><td>Type of Field: </td><td>" + ftyp + "</td></tr>";
        content += "<tr><td>Status: </td><td>" + sta + "</td></tr>";
        content += "<tr><td>Produces Oil: </td><td>" + po + "</td></tr>";
        content += "<tr><td>Cumulative Oil (bbls): </td><td>" + co + "</td></tr>";
        content += "<tr><td>Produces Gas: </td><td>" + pg + "</td></tr>";
        content += "<tr><td>Cumulative Gas (mcf): </td><td>" + cg + "</td></tr>";
        content += "<tr><td>Approximate Acres: </td><td>" + ac + "</td></tr>";
        content += "<tr><td>Producing Formations: </td><td>" + pf + "</td></tr>";
        content += "<span id='field-kid' class='no-display'>{FIELD_KID}</span></table>";

        return content;
    }


    function wellContent(feature) {
        var f = feature.attributes;
        var api = f.API_NUMBER !== "Null" ? f.API_NUMBER : "";
        var currOp = f.CURR_OPERATOR !== "Null" ? f.CURR_OPERATOR : "";
        var type = f.STATUS_TXT !== "Null" ? f.STATUS_TXT : "";
        var stat = f.WELL_CLASS !== "Null" ? f.WELL_CLASS : "";
        var lease = f.LEASE_NAME !== "Null" ? f.LEASE_NAME : "";
        var well = f.WELL_NAME !== "Null" ? f.WELL_NAME : "";
        var fld = f.FIELD_NAME !== "Null" ? f.FIELD_NAME : "";
        var twp = f.TOWNSHIP !== "Null" ? f.TOWNSHIP : "";
        var rng = f.RANGE !== "Null" ? f.RANGE : "";
        var rngd = f.RANGE_DIRECTION !== "Null" ? f.RANGE_DIRECTION : "";
        var sec = f.SECTION !== "Null" ? f.SECTION : "";
        var spt = f.SPOT !== "Null" ? f.SPOT : "";
        var sub4 = f.SUBDIVISION_4_SMALLEST !== "Null" ? f.SUBDIVISION_4_SMALLEST : "";
        var sub3 = f.SUBDIVISION_3 !== "Null" ? f.SUBDIVISION_3 : "";
        var sub2 = f.SUBDIVISION_2 !== "Null" ? f.SUBDIVISION_2 : "";
        var sub1 = f.SUBDIVISION_1_LARGEST !== "Null" ? f.SUBDIVISION_1_LARGEST : "";
        var lon = f.NAD27_LONGITUDE !== "Null" ? f.NAD27_LONGITUDE : "";
        var lat = f.NAD27_LATITUDE !== "Null" ? f.NAD27_LATITUDE : "";
        var co = f.COUNTY !== "Null" ? f.COUNTY : "";
        var pdt = f.PERMIT_DATE_TXT !== "Null" ? f.PERMIT_DATE_TXT : "";
        var sdt = f.SPUD_DATE_TXT !== "Null" ? f.SPUD_DATE_TXT : "";
        var cdt = f.COMPLETION_DATE_TXT !== "Null" ? f.COMPLETION_DATE_TXT : "";
        var pldt = f.PLUG_DATE_TXT !== "Null" ? f.PLUG_DATE_TXT : "";
        var dpth = f.ROTARY_TOTAL_DEPTH !== "Null" ? f.ROTARY_TOTAL_DEPTH.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") : "";
        var elev = f.ELEVATION_KB !== "Null" ? f.ELEVATION_KB.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,") : "";
        var frm = f.PRODUCING_FORMATION !== "Null" ? f.PRODUCING_FORMATION : "";
        var kid = f.KID !== "Null" ? f.KID : "";

        var content = "<table cellpadding='3'><tr><td>API: </td><td>" + api + "</td></tr>";
        content += "<tr><td>Current Operator: </td><td>" + currOp + "</td></tr>"
        content += "<tr><td>Well Type: </td><td>" + type + "</td></tr>";
        content += "<tr><td>Status: </td><td>" + stat + "</td></tr>";
        content += "<tr><td>Lease: </td><td>" + lease + "</td></tr>";
        content += "<tr><td>Well: </td><td>" + well + "</td></tr>";
        content += "<tr><td>Field: </td><td>" + fld + "</td></tr>";
        content += "<tr><td>Location: </td><td>T" + twp + "S R" + rng + rngd + " Sec " + sec + "<br>" + spt + " " + sub4 + " " + sub3 + " " + sub2 + " " + sub1 + "</td></tr>";
        content += "<tr><td>Coordinates (NAD27): </td><td>" + lon + ", " + lat + "</td></tr>";
        content += "<tr><td>County: </td><td>" + co + "</td></tr>";
        content += "<tr><td>Permit Date: </td><td>" + pdt + "</td></tr>";
        content += "<tr><td>Spud Date: </td><td>" + sdt + "</td></tr>";
        content += "<tr><td>Completion Date: </td><td>" + cdt + "</td></tr>";
        content += "<tr><td>Plug Date: </td><td>" + pldt + "</td></tr>";
        content += "<tr><td>Total Depth (ft): </td><td>" + dpth + "</td></tr>";
        content += "<tr><td>Elevation (KB, ft): </td><td>" + elev + "</td></tr>";
        content += "<tr><td>Producing Formation: </td><td>" + frm + "</td></tr>";
        content += "<span id='well-kid' class='no-display'>{KID}</span></table>";

        return content;
    }


    toggleLayer = function(j) {
        var l = map.getLayer(map.layers._items[j].id);
        l.visible = $("#tcb-" + j).is(":checked") ? true : false;
    }

} );
