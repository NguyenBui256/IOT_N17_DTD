'use strict';

var L = require('leaflet');
var LSetup = require('../config/leaflet_setup');
var api = require('../config/api');

var polyUtil = require('@mapbox/polyline');
var data = require('../data');
var panelControl = require('../controls/panel');
var collapseControl = require('../controls/collapse');
var fitControl = require('../controls/fit');
var clearControl = require('../controls/clear');
var solveControl = require('../controls/solve');
var summaryControl = require('../controls/summary');

var routes = [];
var actualSteps = ['job', 'pickup', 'delivery'];

// Helper function to stop event propagation for sidebar interactions
// Prevents clicks from bubbling up to the map
var _stopClickPropagation = function(handler) {
  return function(e) {
    L.DomEvent.stopPropagation(e);
    handler(e);
  };
};

var getJobs = function() {
  return data.jobs;
}

var getShipments = function() {
  return data.shipments;
}

var getVehicles = function() {
  return data.vehicles;
}

var getOverpassQuery = function() {
  var key = document.getElementById('key-cell').value;
  var value = document.getElementById('value-cell').value;
  var bounds = LSetup.map.getBounds();
  var query = '[out:json];node(' + bounds.getSouth() + ',' +
              bounds.getWest() + ',' + bounds.getNorth() + ','+
              bounds.getEast() + ')[' + key + '=' + value + '];out;'
  return query;
}

var _getTasksSize = function() {
  return data.jobs.length + 2 * data.shipments.length;
}

var getNextTaskId = function() {
  return data.maxTaskId + 1;
}

var getNextVehicleId = function() {
  return data.maxVehicleId + 1;
}

var _getVehiclesSize = function() {
  return data.vehicles.length;
}

var checkControls = function() {
  var hasTasks = _getTasksSize() > 0;
  var hasVehicles = _getVehiclesSize() > 0;
  if (hasTasks || hasVehicles) {
    // Fit and clear controls as soon as we have a location.
    if (!LSetup.map.fitControl) {
      LSetup.map.addControl(fitControl);
    }
    if (!LSetup.map.clearControl) {
      LSetup.map.addControl(clearControl);
    }
  }
  if (!LSetup.map.solveControl) {
    // Solve control appears only when there's enough input to fire a
    // solving query.
    if (hasVehicles && hasTasks) {
      solveControl.addTo(LSetup.map);
    }
  } else {
    if (_getTasksSize() === 0) {
      LSetup.map.removeControl(solveControl);
    }
  }
  if (hasSolution()) {
    LSetup.map.removeControl(solveControl);
    LSetup.map.addControl(summaryControl);
  }
  panelControl.showOverpassButton();
}

var _pushToBounds = function(coords) {
  if (data.bounds) {
    data.bounds.extend([coords[1], coords[0]]);
  } else {
    data.bounds = L.latLngBounds([coords[1], coords[0]],
                                 [coords[1], coords[0]]);
  }
}

var _recomputeBounds = function() {
  // Problem bounds are extended upon additions but they need to be
  // recalculated when a deletion might reduce the bounds.
  delete data.bounds;

  for (var i = 0; i < data.vehicles.length; i++) {
    var start = data.vehicles[i].start;
    if (start) {
      _pushToBounds(start);
    }
    var end = data.vehicles[i].end;
    if (end) {
      _pushToBounds(end);
    }
  }

  for (var i = 0; i < data.jobs.length; i++) {
    var loc = data.jobs[i].location;
    _pushToBounds(loc);
  }
}

var fitView = function() {
  if (data.bounds) {
    LSetup.map.fitBounds(data.bounds, {
      paddingBottomRight: [panelControl.getWidth(), 0],
      paddingTopLeft: [50, 0],
    });
  }
}

var hasSolution = function() {
  return routes.length > 0;
}

// Used upon addition to distinguish between start/end or job
// addition.
var _firstPlace = true;
var _hasCapacity = true;

var isFirstPlace = function() {
  return _firstPlace;
}

var firstPlaceSet = function() {
  _firstPlace = false;
}

var hasCapacity = function() {
  return data.activeTab === 'cvrp' || data.activeTab === 'pdp' || data.activeTab === 'custom';
}

var _clearSolution = function() {
  if (hasSolution()) {
    // Back to input mode.
    panelControl.clearSolutionDisplay();
    panelControl.showTaskDisplay();

    for (var i = 0; i < routes.length; ++i) {
      LSetup.map.removeLayer(routes[i]);
    }
    for (var type in data.markers) {
      for (var k in data.markers[type]) {
        data.markers[type][k].setStyle(LSetup.markerStyle[type]);
      }
    }
    LSetup.map.removeControl(summaryControl);

    routes = [];

    // Remove query solution.
    delete data.solution;
  }
}

var clearData = function() {
  // Back to adding a start/end for next place.
  _firstPlace = true;
  _hasCapacity = true;
  data.maxTaskId = 0;
  data.maxVehicleId = 0;

  // Reset PDP state
  data.pdpMode = false;
  data.pdpState = 'idle';
  data.currentPickupLoc = null;
  if (data.tempPickupMarker) {
    LSetup.map.removeLayer(data.tempPickupMarker);
    delete data.tempPickupMarker;
  }
  
  var instrBanner = document.getElementById('pdp-instruction');
  if (instrBanner) {
    instrBanner.style.display = 'none';
  }
  var pdpBtn = document.getElementById('pdp-add-shipment-btn');
  if (pdpBtn) {
    pdpBtn.classList.remove('active');
    pdpBtn.innerText = "Add Shipment (P&D)";
  }

  // Clear all data and markers.
  for (var type in data.markers) {
    for (var k in data.markers[type]) {
      LSetup.map.removeLayer(data.markers[type][k]);
      delete data.markers[type][k];
    }
  }
  for (var k in data.vehiclesMarkers) {
    LSetup.map.removeLayer(data.vehiclesMarkers[k]);
    delete data.vehiclesMarkers[k];
  }

  // Init dataset.
  data.jobs = [];
  data.shipments = [];
  data.vehicles = [];
  data.markers = {
    'job': {},
    'pickup': {},
    'delivery': {}
  };
  data.vehiclesMarkers = {};
  data.pdLines = {};

  // Reset bounds.
  delete data.bounds;

  _clearSolution();
}

var closeAllPopups = function() {
  for (var type in data.markers) {
    for (var k in data.markers[type]) {
      data.markers[type][k].closePopup();
    }
  }
  for (var k in data.vehiclesMarkers) {
    data.vehiclesMarkers[k].closePopup();
  }
}

var _setStart = function(v) {
  var vTable = document.getElementById('panel-vehicles-' + v.id.toString());

  vTable.deleteRow(1);
  var row = vTable.insertRow(1);
  row.setAttribute('class', 'panel-table');
  var idCell = row.insertCell(0);

  var remove = function() {
    if (_removeStart(v)) {
      // Reset start row when removing is ok.
      vTable.deleteRow(1);
      vTable.insertRow(1);
      if (_getTasksSize() === 0 && _getVehiclesSize() === 0) {
        LSetup.map.removeControl(clearControl);
      }
      checkControls();
    }
  }
  idCell.setAttribute('class', 'delete-location');
  idCell.title = 'Click to delete';
  idCell.onclick = _stopClickPropagation(remove);

  // Required when parsing json files with no start description.
  if (!v.startDescription) {
    v.startDescription = 'Start';
  }

  var nameCell = row.insertCell(1);
  nameCell.title = 'Click to center the map';
  nameCell.setAttribute('class', 'vehicle-start');
  nameCell.appendChild(document.createTextNode(v.startDescription));
  nameCell.onclick = _stopClickPropagation(function() {
    showStart(v, true);
  });

  // Marker and popup.
  data.vehiclesMarkers[v.id.toString() + '_start']
    = L.circleMarker([v.start[1], v.start[0]],
                     {
                       radius: 8,
                       weight: 3,
                       fillOpacity: 0.4,
                       color: LSetup.startColor
                     })
    .addTo(LSetup.map);

  var popupDiv = document.createElement('div');
  var par = document.createElement('p');
  par.innerHTML = '<b>Vehicle ' + v.id.toString() + ': </b>' + v.startDescription;
  var deleteButton = document.createElement('button');
  deleteButton.innerHTML = 'Del';
  deleteButton.onclick = _stopClickPropagation(remove);
  popupDiv.appendChild(par);
  popupDiv.appendChild(deleteButton);

  data.vehiclesMarkers[v.id.toString() + '_start']
    .bindPopup(popupDiv)
    .openPopup();
}

var _setEnd = function(v) {
  var vTable = document.getElementById('panel-vehicles-' + v.id.toString());

  vTable.deleteRow(2);
  var row = vTable.insertRow(2);
  row.setAttribute('class', 'panel-table');
  var idCell = row.insertCell(0);

  var remove = function() {
    if (_removeEnd(v)) {
      // Reset end row when removing is ok.
      vTable.deleteRow(2);
      vTable.insertRow(2);
      if (_getTasksSize() === 0 && _getVehiclesSize() === 0) {
        LSetup.map.removeControl(clearControl);
      }
      checkControls();
    }
  }
  idCell.setAttribute('class', 'delete-location');
  idCell.title = 'Click to delete';
  idCell.onclick = _stopClickPropagation(remove);

  // Required when parsing json files with no end description.
  if (!v.endDescription) {
    v.endDescription = 'End';
  }

  var nameCell = row.insertCell(1);
  nameCell.title = 'Click to center the map';
  nameCell.setAttribute('class', 'vehicle-end');
  nameCell.appendChild(document.createTextNode(v.endDescription));
  nameCell.onclick = _stopClickPropagation(function() {
    showEnd(v, true);
  });

  // Marker and popup.
  data.vehiclesMarkers[v.id.toString() + '_end']
    = L.circleMarker([v.end[1], v.end[0]],
                     {
                       radius: 8,
                       weight: 3,
                       fillOpacity: 0.4,
                       color: LSetup.endColor
                     })
    .addTo(LSetup.map);

  var popupDiv = document.createElement('div');
  var par = document.createElement('p');
  par.innerHTML =  '<b>Vehicle ' + v.id.toString() + ': </b>' + v.endDescription;
  var deleteButton = document.createElement('button');
  deleteButton.innerHTML = 'Del';
  deleteButton.onclick = _stopClickPropagation(remove);
  popupDiv.appendChild(par);
  popupDiv.appendChild(deleteButton);

  data.vehiclesMarkers[v.id.toString() + '_end']
    .bindPopup(popupDiv)
    .openPopup();
}

var _deleteAmounts = function() {
  for (var v = 0; v < data.vehicles.length; v++) {
    delete data.vehicles[v].capacity;
  }
  for (var j = 0; j < data.jobs.length; j++) {
    delete data.jobs[j].delivery;
    delete data.jobs[j].pickup;
  }
  alert("All capacity constraints have been removed.")
}

var addVehicle = function(v) {
  _clearSolution();
  data.vehicles.push(v);

  data.maxVehicleId = Math.max(data.maxVehicleId, v.id);

  var tableId = 'panel-vehicles-' + v.id.toString();
  var vTable = document.getElementById(tableId);
  if (!vTable) {
    // Create new table for current vehicle.
    vTable = document.createElement('table');
    vTable.setAttribute('id', tableId);
    vTable.setAttribute('class', 'panel-vehicle');

    // Set title.
    var row = vTable.insertRow(0);

    var titleCell = row.insertCell(0);
    titleCell.setAttribute('colspan', 2);

    var titleName = document.createElement('span');
    titleName.setAttribute('class', 'vehicle-title');
    titleName.appendChild(document.createTextNode('Vehicle ' + v.id.toString()));

    var clone = document.createElement('span');
    clone.setAttribute('class', 'clone-vehicle');
    clone.appendChild(document.createTextNode('Clone >>'));
    clone.onclick = _stopClickPropagation(function() {
      var v_copy = JSON.parse(JSON.stringify(v));
      v_copy.id = getNextVehicleId();
      addVehicle(v_copy);
      checkControls();
    });

    titleCell.appendChild(titleName);
    titleCell.appendChild(clone);

    vTable.insertRow(1);
    vTable.insertRow(2);

    // Capacity Row
    var rowCap = vTable.insertRow(3);
    rowCap.setAttribute('class', 'row-capacity prop-row');
    var cellCap = rowCap.insertCell(0);
    cellCap.setAttribute('colspan', 2);
    cellCap.innerHTML = '<span class="prop-label">Capacity:</span>' +
      '<input type="number" class="prop-input v-capacity" data-id="' + v.id + '" value="' + (v.capacity ? v.capacity[0] : 100) + '" min="0" />';

    // Fuel/Range Row
    var rowFuel = vTable.insertRow(4);
    rowFuel.setAttribute('class', 'row-fuel prop-row');
    var cellFuel = rowFuel.insertCell(0);
    cellFuel.setAttribute('colspan', 2);
    var initRange = v.max_distance ? Math.round(v.max_distance / 1000) : 200;
    cellFuel.innerHTML = '<span class="prop-label">Range (km):</span>' +
      '<input type="number" class="prop-input v-range" data-id="' + v.id + '" value="' + initRange + '" min="0" />';

    // Time Window Row
    var rowTW = vTable.insertRow(5);
    rowTW.setAttribute('class', 'row-timewindow prop-row');
    var cellTW = rowTW.insertCell(0);
    cellTW.setAttribute('colspan', 2);
    var twStart = "08:00";
    var twEnd = "18:00";
    if (v.time_window) {
      var startSec = v.time_window[0];
      var endSec = v.time_window[1];
      var pad = function(num) { return (num < 10 ? '0' : '') + num; };
      var sH = Math.floor(startSec / 3600);
      var sM = Math.floor((startSec % 3600) / 60);
      twStart = pad(sH) + ":" + pad(sM);
      var eH = Math.floor(endSec / 3600);
      var eM = Math.floor((endSec % 3600) / 60);
      twEnd = pad(eH) + ":" + pad(eM);
    }
    cellTW.innerHTML = '<span class="prop-label">Shift TW:</span>' +
      '<div class="prop-time-container">' +
      '<input type="time" class="prop-time-picker v-tw-start" data-id="' + v.id + '" value="' + twStart + '" /> - ' +
      '<input type="time" class="prop-time-picker v-tw-end" data-id="' + v.id + '" value="' + twEnd + '" />' +
      '</div>';

    document.getElementById('panel-vehicles').appendChild(vTable);
  }

  if (v.start) {
    _pushToBounds(v.start);
    _setStart(v);
  }
  if (v.end) {
    _pushToBounds(v.end);
    _setEnd(v);
  }


  _updateAllJobPopups();

  if (LSetup.map && LSetup.map.panelControl) {
    LSetup.map.panelControl.updateInputsVisibility();
  }
}

var _jobDisplay = function(j) {
  var panelList = document.getElementById('panel-tasks');

  var nb_rows = panelList.rows.length;
  var row = panelList.insertRow(nb_rows);
  row.setAttribute('id', 'job-' + j.id.toString());
  var idCell = row.insertCell(0);

  idCell.setAttribute('class', 'delete-location');
  idCell.title = 'Click to delete';
  idCell.onclick = _stopClickPropagation(function() {
    _removeJob(j);
  });

  // Required when parsing json files containing jobs with no
  // description.
  if (!j.description) {
    j.description = 'No description';
  }

  var nameCell = row.insertCell(1);
  nameCell.title = 'Click to center the map';
  nameCell.appendChild(document.createTextNode(j.description));
  nameCell.onclick = _stopClickPropagation(function() {
    _openPopup('job', j.id);
    centerMarker('job', j.id);
  });

  // Details Row
  var detRow = panelList.insertRow(nb_rows + 1);
  detRow.setAttribute('id', 'job-details-' + j.id.toString());
  detRow.setAttribute('class', 'job-details-row');
  var detCell = detRow.insertCell(0);
  detCell.setAttribute('colspan', 2);
  
  var detailsDiv = document.createElement('div');
  detailsDiv.setAttribute('style', 'padding: 2px 10px; background-color: #fafafa; border-bottom: 1px solid #eee;');
  
  var qVal = (j.delivery ? j.delivery[0] : (j.pickup ? j.pickup[0] : 10));
  var capDiv = document.createElement('div');
  capDiv.setAttribute('class', 'row-capacity prop-row');
  capDiv.innerHTML = '<span class="prop-label">Demand Qty:</span>' +
    '<input type="number" class="prop-input j-qty" data-id="' + j.id + '" value="' + qVal + '" min="0" />';
  detailsDiv.appendChild(capDiv);
  
  var twStart = "08:00";
  var twEnd = "18:00";
  if (j.time_windows && j.time_windows.length > 0) {
    var startSec = j.time_windows[0][0];
    var endSec = j.time_windows[0][1];
    var pad = function(num) { return (num < 10 ? '0' : '') + num; };
    var sH = Math.floor(startSec / 3600);
    var sM = Math.floor((startSec % 3600) / 60);
    twStart = pad(sH) + ":" + pad(sM);
    var eH = Math.floor(endSec / 3600);
    var eM = Math.floor((endSec % 3600) / 60);
    twEnd = pad(eH) + ":" + pad(eM);
  }
  
  var twDiv = document.createElement('div');
  twDiv.setAttribute('class', 'row-timewindow prop-row');
  twDiv.innerHTML = '<span class="prop-label">Time Window:</span>' +
    '<div class="prop-time-container">' +
    '<input type="time" class="prop-time-picker j-tw-start" data-id="' + j.id + '" value="' + twStart + '" /> - ' +
    '<input type="time" class="prop-time-picker j-tw-end" data-id="' + j.id + '" value="' + twEnd + '" />' +
    '</div>';
  detailsDiv.appendChild(twDiv);
  detCell.appendChild(detailsDiv);

  _handleJobPopup(j);
  _openPopup('job', j.id);

  if (LSetup.map && LSetup.map.panelControl) {
    LSetup.map.panelControl.updateInputsVisibility();
  }
}

var _setPanelTask = function(s, type) {
  var panelList = document.getElementById('panel-tasks');

  var nb_rows = panelList.rows.length;
  var row = panelList.insertRow(nb_rows);
  row.setAttribute('id', type + '-' + s[type].id.toString());
  var idCell = row.insertCell(0);

  idCell.setAttribute('class', 'delete-location');
  idCell.title = 'Click to delete';
  idCell.onclick = _stopClickPropagation(function() {
    _removeShipment(s);
  });

  // Required when parsing json files containing jobs with no
  // description.
  if (!s[type].description) {
    s[type].description = 'No description';
  }

  var nameCell = row.insertCell(1);
  nameCell.title = 'Click to center the map';
  nameCell.appendChild(document.createTextNode(s[type].description));
  nameCell.onclick = _stopClickPropagation(function() {
    _openPopup(type, s[type].id);
    centerMarker(type, s[type].id);
  });

  // Details Row
  var detRow = panelList.insertRow(nb_rows + 1);
  detRow.setAttribute('id', type + '-details-' + s[type].id.toString());
  detRow.setAttribute('class', 'shipment-details-row');
  var detCell = detRow.insertCell(0);
  detCell.setAttribute('colspan', 2);
  
  var detailsDiv = document.createElement('div');
  detailsDiv.setAttribute('style', 'padding: 2px 10px; background-color: #fafafa; border-bottom: 1px solid #eee;');
  
  if (type === 'pickup') {
    var qVal = (s.amount ? s.amount[0] : 10);
    var capDiv = document.createElement('div');
    capDiv.setAttribute('class', 'row-capacity prop-row');
    capDiv.innerHTML = '<span class="prop-label">Shipment Qty:</span>' +
      '<input type="number" class="prop-input s-qty" data-id="' + s[type].id + '" value="' + qVal + '" min="0" />';
    detailsDiv.appendChild(capDiv);
  }
  
  var twStart = "08:00";
  var twEnd = "18:00";
  if (s[type].time_windows && s[type].time_windows.length > 0) {
    var startSec = s[type].time_windows[0][0];
    var endSec = s[type].time_windows[0][1];
    var pad = function(num) { return (num < 10 ? '0' : '') + num; };
    var sH = Math.floor(startSec / 3600);
    var sM = Math.floor((startSec % 3600) / 60);
    twStart = pad(sH) + ":" + pad(sM);
    var eH = Math.floor(endSec / 3600);
    var eM = Math.floor((endSec % 3600) / 60);
    twEnd = pad(eH) + ":" + pad(eM);
  }
  
  var twDiv = document.createElement('div');
  twDiv.setAttribute('class', 'row-timewindow prop-row');
  twDiv.innerHTML = '<span class="prop-label">' + (type === 'pickup' ? 'Pickup' : 'Delivery') + ' TW:</span>' +
    '<div class="prop-time-container">' +
    '<input type="time" class="prop-time-picker s-tw-start" data-id="' + s[type].id + '" value="' + twStart + '" /> - ' +
    '<input type="time" class="prop-time-picker s-tw-end" data-id="' + s[type].id + '" value="' + twEnd + '" />' +
    '</div>';
  detailsDiv.appendChild(twDiv);
  detCell.appendChild(detailsDiv);
}

var _shipmentDisplay = function(s) {
  _setPanelTask(s, 'pickup');
  _setPanelTask(s, 'delivery');

  _handleShipmentPopup(s);

  if (LSetup.map && LSetup.map.panelControl) {
    LSetup.map.panelControl.updateInputsVisibility();
  }
}

var _setAsStart = function(vRank, j) {
  var marker = data.vehicles[vRank].id.toString() + '_start';
  LSetup.map.removeLayer(data.vehiclesMarkers[marker]);
  delete data.vehiclesMarkers[marker];

  data.vehicles[vRank].start = j.location;
  data.vehicles[vRank].startDescription = j.description;
  _setStart(data.vehicles[vRank]);

  _removeJob(j);
};

var _setAsEnd = function(vRank, j) {
  var marker = data.vehicles[vRank].id.toString() + '_end';
  LSetup.map.removeLayer(data.vehiclesMarkers[marker]);
  delete data.vehiclesMarkers[marker];

  data.vehicles[vRank].end = j.location;
  data.vehicles[vRank].endDescription = j.description;
  _setEnd(data.vehicles[vRank]);

  _removeJob(j);
};

var _handleJobPopup = function(j) {
  var popupDiv = document.createElement('div');
  var par = document.createElement('p');
  par.innerHTML = '<b>Job </b> ' + j.id + '<br>' + j.description;
  var deleteButton = document.createElement('button');
  deleteButton.innerHTML = 'Del';
  deleteButton.onclick = _stopClickPropagation(function() {
    _removeJob(j);
  });

  var startSelect = document.createElement('select');
  var startHeadOption = document.createElement('option');
  startHeadOption.innerHTML = "Start";
  startHeadOption.selected = true;
  startHeadOption.disabled = true;
  startSelect.appendChild(startHeadOption);

  var endSelect = document.createElement('select');
  var endHeadOption = document.createElement('option');
  endHeadOption.innerHTML = "End";
  endHeadOption.selected = true;
  endHeadOption.disabled = true;
  endSelect.appendChild(endHeadOption);

  for (var v = 0; v < data.vehicles.length; v++) {
    var startOption = document.createElement('option');
    startOption.value = v;
    startOption.innerHTML = 'v. ' + data.vehicles[v].id.toString();
    startSelect.appendChild(startOption);

    var endOption = document.createElement('option');
    endOption.value = v;
    endOption.innerHTML = 'v. ' + data.vehicles[v].id.toString();
    endSelect.appendChild(endOption);
  }
  startSelect.onchange = function() {
    _setAsStart(startSelect.options[startSelect.selectedIndex].value, j);
  }
  endSelect.onchange = function() {
    _setAsEnd(endSelect.options[endSelect.selectedIndex].value, j);
  }

  var optionsDiv = document.createElement('div');
  optionsDiv.appendChild(startSelect);
  optionsDiv.appendChild(endSelect);
  optionsDiv.appendChild(deleteButton);

  var optionsTitle = document.createElement('div');
  optionsTitle.setAttribute('class', 'job-options');
  optionsTitle.innerHTML = 'Options >>';
  optionsTitle.onclick = _stopClickPropagation(function() {
    if (optionsDiv.style.display === 'none') {
      optionsDiv.style.display = 'flex';
    } else {
      optionsDiv.style.display = 'none';
    }
    _openPopup('job', j.id);
  });

  popupDiv.appendChild(par);
  popupDiv.appendChild(optionsTitle);
  popupDiv.appendChild(optionsDiv);
  optionsDiv.style.display = 'none';

  data.markers['job'][j.id.toString()].bindPopup(popupDiv);

  data.markers['job'][j.id.toString()].on('popupclose', function() {
    optionsDiv.style.display = 'none';
  });
}

var _handleShipmentPopup = function(s) {
  data.pdLines[s.pickup.id + '-' + s.delivery.id]
    =  L.polyline([[s.pickup.location[1], s.pickup.location[0]],
                   [s.delivery.location[1], s.delivery.location[0]]],
                  LSetup.pdLineStyle);

  for (var type of ['pickup', 'delivery']) {
    var popupDiv = document.createElement('div');
    var par = document.createElement('p');
    par.innerHTML = '<b>' + (type.substring(0, 1)).toUpperCase() +
      type.substring(1, type.length) + '</b> ' +
      s[type].id + '<br>' + s[type].description;

    var deleteButton = document.createElement('button');
    deleteButton.innerHTML = 'Del';
    deleteButton.onclick = _stopClickPropagation(function() {
      _removeShipment(s);
    });

    popupDiv.appendChild(par);
    popupDiv.appendChild(deleteButton);

    data.markers[type][s[type].id.toString()].bindPopup(popupDiv);

    data.markers[type][s[type].id.toString()].on('popupopen', function() {
      data.pdLines[s.pickup.id + '-' + s.delivery.id].addTo(LSetup.map);
    });
    data.markers[type][s[type].id.toString()].on('mouseover', function() {
      data.pdLines[s.pickup.id + '-' + s.delivery.id].addTo(LSetup.map);
    });
    data.markers[type][s[type].id.toString()].on('popupclose', function() {
      LSetup.map.removeLayer(data.pdLines[s.pickup.id + '-' + s.delivery.id]);
    });
    data.markers[type][s[type].id.toString()].on('mouseout', function() {
      LSetup.map.removeLayer(data.pdLines[s.pickup.id + '-' + s.delivery.id]);
    });
  }
}

var _openPopup = function(type, id) {
  data.markers[type][id.toString()].openPopup();
}

var _updateAllJobPopups = function() {
  for (var i = 0; i < data.jobs.length; i++) {
    _handleJobPopup(data.jobs[i]);
  }
}

var centerMarker = function(type, id) {
  LSetup.map.panTo(data.markers[type][id.toString()].getLatLng());
}

var addJob = function(j) {
  if (_getTasksSize() >= api.maxTaskNumber) {
    alert('Number of tasks can\'t exceed ' + api.maxTaskNumber + '.');
    return;
  }


  _clearSolution();
  _pushToBounds(j.location);

  data.maxTaskId = Math.max(data.maxTaskId, j.id);
  data.jobs.push(j);
  data.markers['job'][j.id.toString()]
    = L.circleMarker([j.location[1], j.location[0]],
                     {
                       radius: LSetup.markerStyle['job'].radius,
                       weight: 3,
                       fillOpacity: 0.4,
                       color: LSetup.markerStyle['job'].color
                     })
    .addTo(LSetup.map);

  // Handle display stuff.
  _jobDisplay(j);
}

var addShipment = function(s) {
  if (_getTasksSize() >= api.maxTaskNumber) {
    alert('Number of tasks can\'t exceed ' + api.maxTaskNumber + '.');
    return;
  }


  _clearSolution();

  for (var type of ['pickup', 'delivery']) {
    _pushToBounds(s[type].location);

    data.maxTaskId = Math.max(data.maxTaskId, s.pickup.id);
    data.maxTaskId = Math.max(data.maxTaskId, s.delivery.id);
    data.markers[type][s[type].id.toString()]
      = L.circleMarker([s[type].location[1], s[type].location[0]],
                       {
                         radius: LSetup.markerStyle[type].radius,
                         weight: 3,
                         fillOpacity: 0.4,
                         color: LSetup.markerStyle[type].color
                       })
      .addTo(LSetup.map);
  }
  data.shipments.push(s);

  // Handle display stuff.
  _shipmentDisplay(s);
}

var _removeJob = function(j) {
  _clearSolution();
  LSetup.map.removeLayer(data.markers['job'][j.id.toString()]);
  delete data.markers['job'][j.id.toString()];
  for (var i = 0; i < data.jobs.length; i++) {
    if (data.jobs[i].id == j.id) {
      data.jobs.splice(i, 1);
      
      var jobRow = document.getElementById('job-' + j.id.toString());
      if (jobRow) jobRow.parentNode.removeChild(jobRow);
      var detRow = document.getElementById('job-details-' + j.id.toString());
      if (detRow) detRow.parentNode.removeChild(detRow);

      if (_getTasksSize() === 0 && _getVehiclesSize() === 0) {
        LSetup.map.removeControl(clearControl);
      }
      checkControls();
      break;
    }
  }
  _recomputeBounds();
}

var _removeShipment = function(s) {
  _clearSolution();
  for (var type of ['pickup', 'delivery']) {
    LSetup.map.removeLayer(data.markers[type][s[type].id.toString()]);
    delete data.markers[type][s[type].id.toString()];
  }
  delete data.pdLines[s.pickup.id + '-' + s.delivery.id];

  for (var i = 0; i < data.shipments.length; i++) {
    if (data.shipments[i].pickup.id == s.pickup.id &&
        data.shipments[i].delivery.id == s.delivery.id) {
      data.shipments.splice(i, 1);

      var pickupRow = document.getElementById('pickup-' + s.pickup.id.toString());
      if (pickupRow) pickupRow.parentNode.removeChild(pickupRow);
      var pickupDetRow = document.getElementById('pickup-details-' + s.pickup.id.toString());
      if (pickupDetRow) pickupDetRow.parentNode.removeChild(pickupDetRow);

      var deliveryRow = document.getElementById('delivery-' + s.delivery.id.toString());
      if (deliveryRow) deliveryRow.parentNode.removeChild(deliveryRow);
      var deliveryDetRow = document.getElementById('delivery-details-' + s.delivery.id.toString());
      if (deliveryDetRow) deliveryDetRow.parentNode.removeChild(deliveryDetRow);

      if (_getTasksSize() === 0 && _getVehiclesSize() === 0) {
        LSetup.map.removeControl(clearControl);
      }
      checkControls();
      break;
    }
  }
  _recomputeBounds();
}

var _removeStart = function(v) {
  var allowRemoval = (data.vehicles.length > 1) || v.end;
  if (allowRemoval) {
    _clearSolution();

    LSetup.map.removeLayer(data.vehiclesMarkers[v.id.toString() + '_start']);
    delete data.vehiclesMarkers[v.id.toString()];

    for (var i = 0; i < data.vehicles.length; i++) {
      if (data.vehicles[i].id == v.id) {
        delete data.vehicles[i].start;
        delete data.vehicles[i].startDescription;
        if (!v.end) {
          var vTable = document.getElementById('panel-vehicles-' + v.id.toString());
          vTable.parentNode.removeChild(vTable);
          data.vehicles.splice(i, 1);
          _updateAllJobPopups();
        }
        break;
      }
    }

    _recomputeBounds();
  } else {
    alert('Can\'t delete both start and end with a single vehicle.');
  }
  return allowRemoval;
}

var _removeEnd = function(v) {
  var allowRemoval = (data.vehicles.length > 1) || v.start;
  if (allowRemoval) {
    _clearSolution();

    LSetup.map.removeLayer(data.vehiclesMarkers[v.id.toString() + '_end']);
    delete data.vehiclesMarkers[v.id.toString()];

    for (var i = 0; i < data.vehicles.length; i++) {
      if (data.vehicles[i].id == v.id) {
        delete data.vehicles[i].end;
        delete data.vehicles[i].endDescription;
        if (!v.start) {
          var vTable = document.getElementById('panel-vehicles-' + v.id.toString());
          vTable.parentNode.removeChild(vTable);
          data.vehicles.splice(i, 1);
          _updateAllJobPopups();
        }
        break;
      }
    }

    _recomputeBounds();
  } else {
    alert('Can\'t delete both start and end with a single vehicle.');
  }
  return allowRemoval;
}

var showStart = function(v, center) {
  var k = v.id.toString() + '_start';
  data.vehiclesMarkers[k].openPopup();
  if (center) {
    LSetup.map.panTo(data.vehiclesMarkers[k].getLatLng());
  }
}

var showEnd = function(v, center) {
  var k = v.id.toString() + '_end';
  data.vehiclesMarkers[k].openPopup();
  if (center) {
    LSetup.map.panTo(data.vehiclesMarkers[k].getLatLng());
  }
}

var setSolution = function(solution) {
  data.solution = solution;
}

var getSolution = function() {
  return data.solution;
}

var markUnassigned = function(unassigned) {
  for (var i = 0; i < unassigned.length; ++i) {
    data.markers[unassigned[i].type][unassigned[i].id.toString()]
      .setStyle(LSetup.markerStyle.unassigned);
  }
}

var addRoutes = function(resultRoutes) {
  for (var i = 0; i < resultRoutes.length; ++i) {
    var latlngs = polyUtil.decode(resultRoutes[i]['geometry']);

    var routeColor = LSetup.routeColors[i % LSetup.routeColors.length];

    var path = new L.Polyline(latlngs, {
      opacity: LSetup.opacity,
      weight: LSetup.weight,
      color: routeColor}).addTo(LSetup.map);
    path.bindPopup('Vehicle ' + resultRoutes[i].vehicle.toString());

    data.bounds.extend(latlngs);

    // Hide input task display.
    panelControl.hideTaskDisplay();

    var solutionList = document.getElementById('panel-solution');

    // Add vehicle to solution display
    var nb_rows = solutionList.rows.length;
    var row = solutionList.insertRow(nb_rows);
    row.title = 'Click to center the map';

    var updateRouteOpacities = function (r, highOpacity, lowOpacity) {
      for (var k = 0; k < routes.length; k++) {
        if (k == r) {
          routes[k].setStyle({opacity: highOpacity});
        } else {
          routes[k].setStyle({opacity: lowOpacity});
        }
      }
    }

    var showRoute = function (r) {
      return function() {
        // Increase this route's opacity and decrease others.
        routes[r].openPopup();
        routes[r].bringToFront();
        updateRouteOpacities(r, LSetup.highOpacity, LSetup.lowOpacity);

        LSetup.map.fitBounds(routes[r].getBounds(), {
          paddingBottomRight: [panelControl.getWidth(), 0],
          paddingTopLeft: [50, 0],
        });
      }
    };

    path.on({
      click: showRoute(i),
      popupclose: function() {
        for (var k = 0; k < routes.length; k++) {
          routes[k].setStyle({opacity: LSetup.opacity});
        }
      }
    });
    row.onclick = showRoute(i);

    var vCell = row.insertCell(0);
    vCell.setAttribute('class', 'vehicle-title');
    vCell.setAttribute('colspan', 2);
    vCell.appendChild(document.createTextNode('Vehicle ' + resultRoutes[i].vehicle.toString()));

    var stepRank = 0;
    for (var s = 0; s < resultRoutes[i].steps.length; s++) {
      var step = resultRoutes[i].steps[s];
      if (!actualSteps.includes(step.type)) {
        continue;
      }
      stepRank++;

      var stepId = step.id.toString();

      data.markers[step.type][stepId].setStyle({color: routeColor});

      // Add to solution display
      var nb_rows = solutionList.rows.length;
      var row = solutionList.insertRow(nb_rows);
      row.title = 'Click to center the map';

      // Hack to make sure the marker index is right.
      var showCallback = function(type, id) {
        return function() {
          _openPopup(type, id);
          centerMarker(type, id);
        };
      }
      row.onclick = showCallback(step.type, stepId);

      var idCell = row.insertCell(0);
      idCell.setAttribute('class', 'rank solution-display');
      idCell.innerHTML = stepRank;

      var nameCell = row.insertCell(1);
      nameCell.appendChild(document.createTextNode(step.description));
    }

    // Remember the path. This will cause hasSolution() to return true.
    routes.push(path);
  }

  fitView();
}

/*** Events ***/

// Fit event.
LSetup.map.on('fit', fitView);

// Clear event.
LSetup.map.on('clear', function() {
  // Remove controls.
  if (LSetup.map.fitControl) {
    LSetup.map.removeControl(LSetup.map.fitControl);
  }
  if (LSetup.map.clearControl) {
    LSetup.map.removeControl(LSetup.map.clearControl);
  }
  if (LSetup.map.solveControl) {
    LSetup.map.removeControl(LSetup.map.solveControl);
  }
  if (LSetup.map.summaryControl) {
    LSetup.map.removeControl(LSetup.map.summaryControl);
  }
  clearData();

  // Delete locations display in the right panel.
  LSetup.map.panelControl.clearDisplay();
});

// Collapse panel.
LSetup.map.on('collapse', function() {
  LSetup.map.collapseControl.toggle();
  LSetup.map.panelControl.toggle();
});

/*** end Events ***/

var setData = function(uploadedData) {
  clearData();

  if ('shipments' in uploadedData && uploadedData.shipments.length > 0) {
    data.activeTab = 'pdp';
  } else {
    var hasTW = false;
    var hasCap = false;

    if ('vehicles' in uploadedData) {
      for (var i = 0; i < uploadedData.vehicles.length; i++) {
        var v = uploadedData.vehicles[i];
        if (v.time_window) hasTW = true;
        if (v.capacity) hasCap = true;
      }
    }
    if ('jobs' in uploadedData) {
      for (var i = 0; i < uploadedData.jobs.length; i++) {
        var j = uploadedData.jobs[i];
        if (j.time_windows) hasTW = true;
        if (j.delivery || j.pickup) hasCap = true;
      }
    }

    if (hasTW && hasCap) {
      data.activeTab = 'custom';
    } else if (hasTW) {
      data.activeTab = 'vrptw';
    } else {
      data.activeTab = 'cvrp';
    }
  }

  // Update tabs UI
  var tabs = document.querySelectorAll('.vrp-tab');
  for (var k = 0; k < tabs.length; k++) {
    if (tabs[k].getAttribute('data-variant') === data.activeTab) {
      tabs[k].classList.add('active');
    } else {
      tabs[k].classList.remove('active');
    }
  }

  for (var i = 0; i < uploadedData.vehicles.length; i++) {
    addVehicle(uploadedData.vehicles[i]);
  }

  if ('jobs' in uploadedData) {
    for (var i = 0; i < uploadedData.jobs.length; i++) {
      addJob(uploadedData.jobs[i]);
    }
  }

  if ('shipments' in uploadedData) {
    for (var i = 0; i < uploadedData.shipments.length; i++) {
      addShipment(uploadedData.shipments[i]);
    }
  }

  // Next user input should be a job.
  firstPlaceSet();
}

var setOverpassData = function(data) {
  for (var i = 0; i < data.length; i++) {
    if (_getTasksSize() >= api.maxTaskNumber) {
      alert('Request too large: ' + (data.length - i).toString() + ' POI discarded.');
      return;
    }
    var job = {
      id: data[i]['id'],
      description: data[i]['tags']['name'] || data[i]['id'].toString(),
      location: [data[i]['lon'], data[i]['lat']]
    }
    addJob(job);
  }
}

var loadSolution = function(data) {
  if ('solution' in data) {
    setSolution(data.solution);
  }
}

module.exports = {
  fitView: fitView,
  clearData: clearData,
  getJobs: getJobs,
  getShipments: getShipments,
  getVehicles: getVehicles,
  showStart: showStart,
  setSolution: setSolution,
  getSolution: getSolution,
  addRoutes: addRoutes,
  getNextTaskId: getNextTaskId,
  getNextVehicleId: getNextVehicleId,
  closeAllPopups: closeAllPopups,
  isFirstPlace: isFirstPlace,
  hasCapacity: hasCapacity,
  firstPlaceSet: firstPlaceSet,
  addVehicle: addVehicle,
  markUnassigned: markUnassigned,
  centerMarker: centerMarker,
  addJob: addJob,
  checkControls: checkControls,
  setData: setData,
  loadSolution: loadSolution,
  getOverpassQuery: getOverpassQuery,
  setOverpassData: setOverpassData
};
