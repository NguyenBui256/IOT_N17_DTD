'use strict';

var LSetup = require('../config/leaflet_setup');
var dataHandler = require('./data_handler');
var geocoder = require('./geocoder');
var address = require('./address');
var panelControl = require('../controls/panel');

var data = require('../data');

var _processAddPlace = function(latlng, name) {
  if (data.pdpMode) {
    if (data.pdpState === 'waiting_for_pickup') {
      data.currentPickupLoc = {
        latlng: latlng,
        name: name
      };
      
      // Update instruction banner
      var instrText = document.getElementById('pdp-instruction-text');
      if (instrText) {
        instrText.innerText = "Click on the map to set the Delivery location";
      }
      data.pdpState = 'waiting_for_delivery';
      
      // Add a temporary marker for visual feedback
      data.tempPickupMarker = L.circleMarker([latlng.lat, latlng.lng], {
        radius: LSetup.markerStyle['pickup'].radius,
        weight: 3,
        fillOpacity: 0.4,
        color: LSetup.markerStyle['pickup'].color
      }).addTo(LSetup.map);
      
    } else if (data.pdpState === 'waiting_for_delivery') {
      if (data.tempPickupMarker) {
        LSetup.map.removeLayer(data.tempPickupMarker);
        delete data.tempPickupMarker;
      }
      
      var pId = dataHandler.getNextTaskId();
      var dId = pId + 1;
      
      var shipment = {
        pickup: {
          id: pId,
          description: data.currentPickupLoc.name,
          location: [data.currentPickupLoc.latlng.lng, data.currentPickupLoc.latlng.lat]
        },
        delivery: {
          id: dId,
          description: name,
          location: [latlng.lng, latlng.lat]
        },
        amount: [10] // Default amount
      };
      
      dataHandler.addShipment(shipment);
      dataHandler.checkControls();
      
      data.pdpState = 'waiting_for_pickup';
      var instrText = document.getElementById('pdp-instruction-text');
      if (instrText) {
        instrText.innerText = "Click on the map to set the Pickup location";
      }
    }
  } else {
    if (dataHandler.isFirstPlace()) {
      dataHandler.firstPlaceSet();
      
      var v = {
        'id': dataHandler.getNextVehicleId(),
        'start': [latlng.lng, latlng.lat],
        'startDescription': name,
        'end': [latlng.lng, latlng.lat],
        'endDescription': name
      };
      
      dataHandler.addVehicle(v);
      dataHandler.checkControls();
      dataHandler.showStart(v, false);
      panelControl.showOverpassDisplay();
    } else {
      var j = {
        'id': dataHandler.getNextTaskId(),
        'description': name,
        'location': [latlng.lng, latlng.lat]
      };
      
      dataHandler.addJob(j);
      dataHandler.checkControls();
    }
  }
};

// Add locations.
var addPlace = function(latlng, name) {
  if (LSetup.maxBounds && !LSetup.maxBounds.contains(latlng)) {
    alert('Sorry, unsupported location. :-(');
    return;
  }
  panelControl.hideInitDiv();

  if (name) {
    _processAddPlace(latlng, name);
  } else {
    // 1. Add place instantly with a placeholder
    var placeholderName = 'Location (' + latlng.lat.toFixed(5) + ', ' + latlng.lng.toFixed(5) + ')';
    
    var wasFirstPlace = dataHandler.isFirstPlace();
    var isPdp = data.pdpMode;
    var pdpStateBefore = data.pdpState;
    
    var expectedVehicleId = dataHandler.getNextVehicleId();
    var expectedJobId = dataHandler.getNextTaskId();
    
    _processAddPlace(latlng, placeholderName);
    
    // 2. Perform geocoding asynchronously
    geocoder.defaultGeocoder.reverse(latlng, LSetup.map.options.crs.scale(19), function(results) {
      if (!results) return;
      var r = results[0];
      if (r) {
        var realName = address.display(r);
        
        if (isPdp) {
          if (pdpStateBefore === 'waiting_for_pickup') {
            if (data.currentPickupLoc && data.currentPickupLoc.latlng === latlng) {
              data.currentPickupLoc.name = realName;
            }
            data.shipments.forEach(function(s) {
              if (s.pickup.location[0] === latlng.lng && s.pickup.location[1] === latlng.lat) {
                s.pickup.description = realName;
                var row = document.getElementById('pickup-' + s.pickup.id);
                if (row) {
                  var cells = row.getElementsByTagName('td');
                  if (cells.length > 1) {
                    cells[1].innerText = realName;
                  }
                }
              }
            });
          } else if (pdpStateBefore === 'waiting_for_delivery') {
            data.shipments.forEach(function(s) {
              if (s.delivery.location[0] === latlng.lng && s.delivery.location[1] === latlng.lat) {
                s.delivery.description = realName;
                var row = document.getElementById('delivery-' + s.delivery.id);
                if (row) {
                  var cells = row.getElementsByTagName('td');
                  if (cells.length > 1) {
                    cells[1].innerText = realName;
                  }
                }
              }
            });
          }
        } else {
          if (wasFirstPlace) {
            var v = data.vehicles.find(function(veh) { return veh.id === expectedVehicleId; });
            if (v) {
              v.startDescription = realName;
              v.endDescription = realName;
              var row = document.getElementById('panel-vehicles-' + expectedVehicleId);
              if (row) {
                var startSpan = row.querySelector('.vehicle-start');
                if (startSpan) startSpan.innerText = realName;
              }
            }
          } else {
            var j = data.jobs.find(function(job) { return job.id === expectedJobId; });
            if (j) {
              j.description = realName;
              var row = document.getElementById('job-' + expectedJobId);
              if (row) {
                var cells = row.getElementsByTagName('td');
                if (cells.length > 1) {
                  cells[1].innerText = realName;
                }
              }
            }
          }
        }
      }
    });
  }
}

module.exports = {
  addPlace: addPlace
};
