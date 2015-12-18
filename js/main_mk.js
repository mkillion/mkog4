require([
	"dojo/_base/lang",
	"dojo/on",
	"dojo/dom",
	"application/Drawer",
    "application/DrawerMenu"
],
function(
	lang,
	on,
	dom,
	Drawer,
	DrawerMenu
) {
	var drawer = new Drawer({
        showDrawerSize: 850,
        borderContainer: 'bc_outer',
        contentPaneCenter: 'cp_outer_center',
        contentPaneSide: 'cp_outer_left',
        toggleButton: 'hamburger_button'
    });

    on(drawer, 'resize', lang.hitch(this, function () {
        // check mobile button status
        //this._checkMobileGeocoderVisibility();
    }));
    drawer.startup();

    createMenus();

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