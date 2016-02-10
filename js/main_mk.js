require([
	"dojo/_base/lang",
	"dojo/on",
	"dojo/dom",
    "dojo/window",
    "dojo/_base/array",
    "dojo/store/Memory",
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
        if ($("#cp_outer_left").css("width") === "293px") {
            $("#cp_outer_left").css("width", "0px");
        } else {
            $("#cp_outer_left").css("width", "293px");
        }
    } );

    createMenus();
    createTools();
    popCountyDropdown();

    // Combo box for og fields:
    $.get("fields_json.txt", function(response) {
        var fieldData = JSON.parse(response);
        var fieldNames = fieldData.items;

        var fieldStore = new Memory( {data: fieldNames} );
        var comboBox = new ComboBox( {
            id: "fieldSelect",
            store: fieldStore,
            searchAttr: "name"
        }, "fieldSelect").startup();
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
    var usgsEventsLayer = new ArcGISDynamicLayer( {url:"http://services.kgs.ku.edu/arcgis1/rest/services/co2/seismic_1/MapServer", visibleLayers:[8], id:"Earthquakes", visible:false} );
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
        identifyParams.tolerance = 3;
        identifyParams.layerIds = [12, 0, 8, 1];
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

    // Don't display locate widget on larger devices:
    /*if (win.getBox().w > 1280) {
        locateBtn.set("visible", false);
    }*/

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
        $("[id^=find]").fadeOut("slow");
        $(".find-header").removeClass("esri-icon-down-arrow");
        $(this).addClass("esri-icon-down-arrow");
        var findBody = $(this).attr("id");
        $("#find-"+findBody).fadeIn("slow");
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
                findParams.searchText = dom.byId("fieldSelect").value;
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
            // TODO: There's a bug here. point graphic appears huge on the map at first but displays correctly after the map extent changes in some way.
            // It works corrrectly on subsequent passes (after extent has been changed).
            // Adding a new graphics layer every time makes it work correctly, but the layers pile up. either wait on 4.0 final release and test, or
            // find a way to test for existence of second graphics layer and remove it.
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
        content += '<table><tr><td class="find-label">Name:</td><td><input id="fieldSelect"></td><td><button class=find-button onclick=findIt("field")>Find</button></td></tr></table>';
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
        content += '<div class="panel-header">Layers <span class="esri-icon-erase" title="Clear Graphics & Highlights"></span></div>';
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
                    tocContent += "</span><span class='esri-icon-forward' title='Make Layer Opaque' onclick='changeOpacity(&quot;" + layerID + "&quot;,&quot;up&quot;);'></span><span class='esri-icon-reverse' title='Make Layer Transparent' onclick='changeOpacity(&quot;" + layerID + "&quot;,&quot;down&quot;);'>";
                }
                tocContent += "</div>";
            }
        }
        $("#lyrs-toc").html(tocContent);

        // Add addtional layer-specific controls (reference by hyphenated layer id):
        $("#Oil-and-Gas-Wells").append("</span><span class='esri-icon-filter' onclick='filterWells(&quot;og&quot;);' title='Filter Wells'></span><span class='esri-icon-labels' onclick='labelWells(&quot;og&quot;);' title='Label Wells'>");
        $("#WWC5-Water-Wells").append("<span class='esri-icon-filter' onclick='filterWells(&quot;wwc5&quot;);' title='Filter Wells'></span><span class='esri-icon-labels' onclick='labelWells(&quot;wwc5&quot;);' title='Label Wells'></span>");
        $("#Earthquakes").append("<span class='esri-icon-filter' onclick='filterEvents();' title='Filter Earthquakes'></span><span class='esri-icon-description' onclick='showDescription(&quot;events&quot;)'></span>");
        $("#LEPC-Crucial-Habitat").append("<span class='esri-icon-description' onclick='showDescription(&quot;lepc&quot;)'></span>");
    }


    labelWells = function(type) {
        // TODO:
        console.log("label wells function");
    }


    filterWells = function(type) {
        // TODO:
        console.log("filter wells function");
        console.log(type);
    }


    filterEvents = function() {
        // TODO:
        console.log("filter events function");
    }


    showDescription = function(type) {
        // TODO:
        console.log("show descriptions " + type);
    }


    changeOpacity = function(id, dir) {
        var lyr = map.getLayer(id);
        var incr = (dir === "down") ? -0.2 : 0.2;
        lyr.opacity = lyr.opacity + incr;
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
        content += "<span id='field-kid' class='hide'>{FIELD_KID}</span></table>";

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
        content += "<span id='well-kid' class='hide'>{KID}</span></table>";

        return content;
    }


    toggleLayer = function(j) {
        var l = map.getLayer(map.layers._items[j].id);
        l.visible = $("#tcb-" + j).is(":checked") ? true : false;
    }

} );
