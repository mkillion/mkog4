require([
	"dojo/_base/lang",
	"dojo/on",
	"application/Drawer",
    "application/DrawerMenu"
],
function(
	lang,
	on,
	Drawer,
	DrawerMenu
) {
	this._drawer = new Drawer({
        showDrawerSize: this._showDrawerSize,
        borderContainer: 'bc_outer',
        contentPaneCenter: 'cp_outer_center',
        contentPaneSide: 'cp_outer_left',
        toggleButton: 'hamburger_button'
    });
    // drawer resize event
    on(this._drawer, 'resize', lang.hitch(this, function () {
    	console.log("resize event");
        // check mobile button status
        //this._checkMobileGeocoderVisibility();
    }));
    // startup drawer
    this._drawer.startup();
} );