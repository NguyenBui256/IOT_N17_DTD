'use strict';

var dataHandler = require('./data_handler');
var api = require('../config/api');
var summaryControl = require('../controls/summary');

var solve = function() {
  var data = require('../data');

  // Format json input for solving. Use copies as we might want to
  // update amounts without messing initial objects.
  var input = {
    jobs: JSON.parse(JSON.stringify(dataHandler.getJobs())),
    shipments: JSON.parse(JSON.stringify(dataHandler.getShipments())),
    vehicles: JSON.parse(JSON.stringify(dataHandler.getVehicles())),
    "options":{
      "g": true
    }
  };

  var parseTimeToSeconds = function(timeStr) {
    if (!timeStr) return 0;
    var parts = timeStr.split(':');
    var hours = parseInt(parts[0]) || 0;
    var minutes = parseInt(parts[1]) || 0;
    return hours * 3600 + minutes * 60;
  };

  // Read vehicle constraints from UI
  input.vehicles.forEach(function(v) {
    // 1. Capacity
    var capInput = document.querySelector('.v-capacity[data-id="' + v.id + '"]');
    if (capInput && (data.activeTab === 'cvrp' || data.activeTab === 'custom' || data.activeTab === 'pdp')) {
      var val = parseInt(capInput.value);
      v.capacity = isNaN(val) ? [100] : [val];
    } else {
      delete v.capacity;
    }

    // 2. Fuel / Range (max_distance)
    var rangeInput = document.querySelector('.v-range[data-id="' + v.id + '"]');
    if (rangeInput && (data.activeTab === 'cvrp' || data.activeTab === 'vrptw' || data.activeTab === 'custom')) {
      var val = parseInt(rangeInput.value);
      if (!isNaN(val) && val > 0) {
        v.max_distance = val * 1000; // Convert km to meters
      }
    } else {
      delete v.max_distance;
    }

    // 3. Time Window
    var twStartInput = document.querySelector('.v-tw-start[data-id="' + v.id + '"]');
    var twEndInput = document.querySelector('.v-tw-end[data-id="' + v.id + '"]');
    if (twStartInput && twEndInput && (data.activeTab === 'vrptw' || data.activeTab === 'custom' || data.activeTab === 'pdp')) {
      var startSec = parseTimeToSeconds(twStartInput.value);
      var endSec = parseTimeToSeconds(twEndInput.value);
      if (endSec > startSec) {
        v.time_window = [startSec, endSec];
      }
    } else {
      delete v.time_window;
    }
  });

  // Read Job/Shipment constraints from UI
  if (data.activeTab === 'pdp') {
    input.jobs = []; // PDP mode doesn't use standard jobs

    input.shipments.forEach(function(s) {
      // 1. Quantity
      var qtyInput = document.querySelector('.s-qty[data-id="' + s.pickup.id + '"]');
      if (qtyInput) {
        var val = parseInt(qtyInput.value);
        s.amount = isNaN(val) ? [10] : [val];
      }

      // 2. Pickup Time Window
      var pStart = document.querySelector('.s-tw-start[data-id="' + s.pickup.id + '"]');
      var pEnd = document.querySelector('.s-tw-end[data-id="' + s.pickup.id + '"]');
      if (pStart && pEnd) {
        var startSec = parseTimeToSeconds(pStart.value);
        var endSec = parseTimeToSeconds(pEnd.value);
        if (endSec > startSec) {
          s.pickup.time_windows = [[startSec, endSec]];
        }
      }

      // 3. Delivery Time Window
      var dStart = document.querySelector('.s-tw-start[data-id="' + s.delivery.id + '"]');
      var dEnd = document.querySelector('.s-tw-end[data-id="' + s.delivery.id + '"]');
      if (dStart && dEnd) {
        var startSec = parseTimeToSeconds(dStart.value);
        var endSec = parseTimeToSeconds(dEnd.value);
        if (endSec > startSec) {
          s.delivery.time_windows = [[startSec, endSec]];
        }
      }
    });
  } else {
    input.shipments = []; // Other modes do not use shipments

    input.jobs.forEach(function(j) {
      // 1. Demand Qty
      var qtyInput = document.querySelector('.j-qty[data-id="' + j.id + '"]');
      if (qtyInput && (data.activeTab === 'cvrp' || data.activeTab === 'custom')) {
        var val = parseInt(qtyInput.value);
        j.delivery = isNaN(val) ? [10] : [val];
      } else {
        delete j.delivery;
        delete j.pickup;
      }

      // 2. Time Window
      var jStart = document.querySelector('.j-tw-start[data-id="' + j.id + '"]');
      var jEnd = document.querySelector('.j-tw-end[data-id="' + j.id + '"]');
      if (jStart && jEnd && (data.activeTab === 'vrptw' || data.activeTab === 'custom')) {
        var startSec = parseTimeToSeconds(jStart.value);
        var endSec = parseTimeToSeconds(jEnd.value);
        if (endSec > startSec) {
          j.time_windows = [[startSec, endSec]];
        }
      } else {
        delete j.time_windows;
      }
    });
  }

  if (!dataHandler.hasCapacity() && input.vehicles.length > 1) {
    for (var j = 0; j < input.jobs.length; j++) {
      input.jobs[j].delivery = [1];
    }
    var C = Math.ceil(1.2 * input.jobs.length / input.vehicles.length);
    for (var v = 0; v < input.vehicles.length; v++) {
      input.vehicles[v].capacity = [C];
    }
  }

  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4) {
      document.getElementById('wait-icon').removeAttribute('class');
      if (xhttp.status == 200) {
        dataHandler.setSolution(JSON.parse(xhttp.response));
        plotSolution();
      } else {
        alert('Error: ' + xhttp.status);
      }
    }
  };
  var target = api.host;
  if (api.port) {
    target += ':' + api.port;
  }
  xhttp.open('POST', target, false);
  xhttp.setRequestHeader('Content-type', 'application/json');
  xhttp.send(JSON.stringify(input));
  dataHandler.closeAllPopups();
}

var plotSolution = function() {
  var result = dataHandler.getSolution();
  if (result['code'] !== 0) {
    alert(result['error']);
    return;
  }

  dataHandler.markUnassigned(result.unassigned);
  dataHandler.addRoutes(result.routes);
  dataHandler.checkControls();
  summaryControl.update(result);
}

module.exports = {
  solve: solve,
  plotSolution: plotSolution
};
