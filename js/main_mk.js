require([
	"dojo/_base/lang",
	"dojo/on",
	"dojo/dom",
    "dojo/window",
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
    "dojo/domReady!"
],
function(
	lang,
	on,
	dom,
    win,
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
    LocateVM
) {
    // Set up basic frame:
    window.document.title = "FooBar";
    $("#title").html("Kansas Oil and Gas<span id='kgs-brand'>Kansas Geological Survey</span>");

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

    /*on(drawer, 'resize', lang.hitch(this, function () {
        // check mobile button status
        //this._checkMobileGeocoderVisibility();
    } ) );*/

    createMenus();
    // End framework.

    // Create map and map widgets:
    var fieldsLayerURL = "http://services.kgs.ku.edu/arcgis2/rest/services/oilgas/oilgas_fields/MapServer";
    var wellsLayerURL = "http://services.kgs.ku.edu/arcgis2/rest/services/oilgas/oilgas_general/MapServer";

    var basemapLayer = new ArcGISTiledLayer( {url:"http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer", id:"Base Map"} );
    var fieldsLayer = new ArcGISTiledLayer( {url:fieldsLayerURL, id:"Oil and Gas Fields"} );
    var wellsLayer = new ArcGISDynamicLayer( {url:wellsLayerURL, visibleLayers:[0], id:"Oil and Gas Wells"} );
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
            view: view/*,
            graphicsLayer: gl*/
        } )
    }, "LocateButton");
    locateBtn.startup();
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


    toggleLayer = function(j) {
        var l = map.getLayer(map.layers._items[j].id);
        l.visible = $("#tcb-" + j).is(":checked") ? true : false;
    }

} );
