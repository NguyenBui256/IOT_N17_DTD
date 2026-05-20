'use strict';

var LSetup = require('./config/leaflet_setup');
var panelControl = require('./controls/panel');
var collapseControl = require('./controls/collapse');
var locationsHandler = require('./utils/locations');
var geocoder = require('./utils/geocoder');
var overpass = require('./utils/overpass');
var address = require('./utils/address');
var fileHandler = require('./utils/file_handler');
var solutionHandler = require('./utils/solution_handler');

panelControl.addTo(LSetup.map);
collapseControl.addTo(LSetup.map);
fileHandler.setFile();

LSetup.map.on('click', function(e) {
  // Guard: ignore clicks that originated from the sidebar panel
  if (e.originalEvent) {
    var target = e.originalEvent.target;
    var panel = document.querySelector('.panel-control');
    if (panel && (panel === target || panel.contains(target))) {
      return;
    }
  }
  locationsHandler.addPlace(e.latlng);
});

LSetup.map.on('solve', solutionHandler.solve);

LSetup.map.on('overpass', overpass.query);

geocoder.control.markGeocode = function(result) {
  locationsHandler.addPlace(result.geocode.center,
                            address.display(result.geocode));
};

geocoder.control.addTo(LSetup.map);
