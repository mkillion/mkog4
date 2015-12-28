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
    ArcGISDynamicLayer
) {
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

    on(drawer, 'resize', lang.hitch(this, function () {
        // check mobile button status
        //this._checkMobileGeocoderVisibility();
    } ) );

    createMenus();

    fieldsLayer = new ArcGISTiledLayer( {url:"http://services.kgs.ku.edu/arcgis2/rest/services/oilgas/oilgas_fields/MapServer", title:"Oil and Gas Fields"} );
    wellsLayer = new ArcGISDynamicLayer( {url:"http://services.kgs.ku.edu/arcgis2/rest/services/oilgas/oilgas_general/MapServer", visibleLayers:[0], title:"Oil and Gas Wells"} );

    var map = new Map( {
        basemap: "gray",
        layers: [fieldsLayer, wellsLayer]
    } );

    var view = new MapView( {
        map: map,
        container: "mapDiv",
        center: [-98, 38],
        zoom: 7
    } );
    view.ui.components = ["zoom", "compass"];

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

        // Create menus:
        var drawerMenu = new DrawerMenu({
            menus: drawerMenus
        }, dom.byId("drawer_menus"));
        drawerMenu.startup();
    }

} );