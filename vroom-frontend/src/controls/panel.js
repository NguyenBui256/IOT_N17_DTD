'use strict';

var L = require('leaflet');

var panelControl = L.Control.extend({
  options: {
    position: 'topright'
  },

  onAdd: function (map) {
    // Add reference to map.
    map.panelControl = this;

    // Main panel div.
    this._div = L.DomUtil.create('div', 'panel-control');
    // Initialize visibility state for proper toggle behavior
    this._div.style.visibility = 'visible';
    L.DomEvent.disableClickPropagation(this._div);
    L.DomEvent.disableScrollPropagation(this._div);

    // Header for panel control.
    var headerDiv = document.createElement('div');
    headerDiv.setAttribute('class', 'panel-header');
    headerDiv.innerHTML = '<h3 style="margin: 0; padding: 10px 0; color: #1a73e8; font-weight: 700; font-size: 1.2rem; letter-spacing: 0.5px; text-transform: uppercase; border-bottom: 2px solid #e8f0fe; padding-bottom: 12px; margin-bottom: 10px;">VRP Nhom 16</h3>';
    this._div.appendChild(headerDiv);

    // Custom VRP Tabs
    var tabsDiv = document.createElement('div');
    tabsDiv.setAttribute('class', 'vrp-tabs');

    var tabNames = [
      { id: 'cvrp', label: 'CVRP' },
      { id: 'vrptw', label: 'VRPTW' },
      { id: 'pdp', label: 'PDP' },
      { id: 'custom', label: 'Custom' }
    ];

    var self = this;
    var data = require('../data');

    tabNames.forEach(function (tabInfo) {
      var tabBtn = document.createElement('div');
      var isActive = (data.activeTab === tabInfo.id);
      tabBtn.setAttribute('class', 'vrp-tab' + (isActive ? ' active' : ''));
      tabBtn.setAttribute('data-variant', tabInfo.id);
      tabBtn.innerText = tabInfo.label;

      tabBtn.onclick = function () {
        if (data.activeTab === tabInfo.id) return;

        // Remove active class from all tabs
        var tabs = tabsDiv.querySelectorAll('.vrp-tab');
        for (var k = 0; k < tabs.length; k++) {
          tabs[k].classList.remove('active');
        }
        tabBtn.classList.add('active');

        // Update model
        data.activeTab = tabInfo.id;

        // Handle PDP modes
        if (data.activeTab !== 'pdp' && data.activeTab !== 'custom') {
          self.disablePdpMode();
        }

        // Update visual inputs visibility
        self.updateInputsVisibility();

        // Redraw solution if any, or clear it
        var dataHandler = require('../utils/data_handler');
        dataHandler.checkControls();
      };

      tabsDiv.appendChild(tabBtn);
    });
    this._div.appendChild(tabsDiv);

    // Add Shipment Button (PDP / Custom mode only)
    this._pdpBtn = document.createElement('button');
    this._pdpBtn.setAttribute('id', 'pdp-add-shipment-btn');
    this._pdpBtn.setAttribute('class', 'pdp-add-btn');
    this._pdpBtn.innerText = "Add Shipment (P&D)";
    this._pdpBtn.style.display = 'none'; // Hidden initially
    this._pdpBtn.onclick = function (e) {
      L.DomEvent.stopPropagation(e);
      self.togglePdpMode();
    };
    this._div.appendChild(this._pdpBtn);

    // Bind PDP cancel button from DOM
    setTimeout(function () {
      var cancelBtn = document.getElementById('pdp-instruction-cancel');
      if (cancelBtn) {
        cancelBtn.onclick = function () {
          self.disablePdpMode();
        };
      }
    }, 100);

    // Wait icon displayed while solving.
    this._waitDisplayDiv = document.createElement('div');
    this._waitDisplayDiv.setAttribute('class', 'wait-display');
    var waitIcon = document.createElement('i');
    waitIcon.setAttribute('id', 'wait-icon');
    this._waitDisplayDiv.appendChild(waitIcon);
    this._div.appendChild(this._waitDisplayDiv);

    // Initial displayed message.
    this._initDiv = document.createElement('div');
    this._initDiv.setAttribute('id', 'init-display');

    var header = document.createElement('p');
    header.innerHTML = '<b>Add locations either by:</b>'

    var list = document.createElement('ul');
    var clickEl = document.createElement('li');
    clickEl.innerHTML = 'clicking on the map;';
    list.appendChild(clickEl);
    var uploadEl = document.createElement('li');
    uploadEl.innerHTML = 'using a file with one address (or Lat,Lng coord) on each line.';
    list.appendChild(uploadEl);

    var jsonUploadEl = document.createElement('li');
    jsonUploadEl.innerHTML = 'using a <a href="https://github.com/VROOM-Project/vroom/blob/master/docs/API.md">json-formatted</a> file.';

    var fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.setAttribute('id', 'user-file');

    jsonUploadEl.appendChild(fileInput);
    list.appendChild(jsonUploadEl);

    this._initDiv.appendChild(header);
    this._initDiv.appendChild(list);
    this._div.appendChild(this._initDiv);

    // Table for vehicles display.
    this._vehiclesDiv = document.createElement('div');
    this._vehiclesDiv.setAttribute('id', 'panel-vehicles');

    // Table for tasks display.
    this._taskTable = document.createElement('table');
    this._taskTable.setAttribute('id', 'panel-tasks');
    this._taskTable.setAttribute('class', 'panel-table');

    // Table for task-ordered solution display.
    this._solutionTable = document.createElement('table');
    this._solutionTable.setAttribute('id', 'panel-solution');
    this._solutionTable.setAttribute('class', 'panel-table');

    // Form for the Overpass query
    this._overpassDiv = document.createElement('div');
    this._overpassDiv.setAttribute('id', 'panel-overpass');
    this._overpassDiv.style.display = 'none';

    this.addOverpassForm(map);

    var tableDiv = document.createElement('div');

    tableDiv.appendChild(this._vehiclesDiv);
    tableDiv.appendChild(document.createElement('hr'));
    tableDiv.appendChild(this._overpassDiv);
    tableDiv.appendChild(this._taskTable);
    tableDiv.appendChild(this._solutionTable);
    this._div.appendChild(tableDiv);

    // Prevent events on this control to alter the underlying map.
    L.DomEvent.disableClickPropagation(this._div);
    L.DomEvent.disableScrollPropagation(this._div);
    L.DomEvent.on(this._div, 'mousewheel', L.DomEvent.stopPropagation);
    L.DomEvent.on(this._div, 'mousedown', L.DomEvent.stopPropagation);
    L.DomEvent.on(this._div, 'mouseup', L.DomEvent.stopPropagation);
    L.DomEvent.on(this._div, 'touchstart', L.DomEvent.stopPropagation);
    L.DomEvent.on(this._div, 'touchend', L.DomEvent.stopPropagation);
    L.DomEvent.on(this._div, 'dblclick', L.DomEvent.stopPropagation);
    L.DomEvent.on(this._div, 'pointerdown', L.DomEvent.stopPropagation);

    return this._div;
  },

  onRemove: function (map) {
    // Remove reference from map.
    delete map.panelControl;
  },

  clearTaskDisplay: function () {
    // Delete tasks display.
    for (var i = this._taskTable.rows.length; i > 0; i--) {
      this._taskTable.deleteRow(i - 1);
    }
  },

  clearVehiclesDisplay: function () {
    // Delete vehicles div.
    this._vehiclesDiv.innerHTML = "";
  },

  clearDisplay: function () {
    this.clearTaskDisplay();
    this.clearVehiclesDisplay();
    this.hideOverpassDisplay();
    this.showInitDiv();
  },

  clearSolutionDisplay: function () {
    for (var i = this._solutionTable.rows.length; i > 0; i--) {
      this._solutionTable.deleteRow(i - 1);
    }
  },

  hideTaskDisplay: function () {
    this._taskTable.style.display = 'none';
  },

  showTaskDisplay: function () {
    this._taskTable.style.display = 'block';
  },

  hideInitDiv: function () {
    this._initDiv.style.display = 'none';
  },

  showInitDiv: function () {
    this._initDiv.style.display = 'block';
  },

  hideOverpassDisplay: function () {
    this._overpassDiv.style.display = 'none';
  },

  showOverpassDisplay: function () {
    this._overpassDiv.style.display = 'block';
  },

  hideOverpassButton: function () {
    document.getElementById('button-request').style.display = 'none';
  },

  showOverpassButton: function () {
    document.getElementById('button-request').style.display = 'block';
  },

  addOverpassForm: function (map) {
    var overpassForm = document.createElement('table');
    overpassForm.setAttribute('id', 'table-overpass');

    // Title
    var overpassHeading = document.createElement('h2');
    overpassHeading.innerHTML = 'Add locations';
    overpassForm.appendChild(overpassHeading);
    var clickOption = document.createElement('div');
    clickOption.setAttribute('class', 'overpass-description');
    clickOption.innerHTML = '- by clicking on the map';
    overpassForm.appendChild(clickOption);

    // Table containing the Formular
    var tagTable = document.createElement('table');
    tagTable.setAttribute('class', 'overpass-table');

    // Subtitle
    var overpassSubtitle = document.createElement('text');
    var tagsText = 'tag';
    overpassSubtitle.innerHTML = '- using OpenStreetMap ' + tagsText.link('https://wiki.openstreetmap.org/wiki/Tags');
    overpassSubtitle.setAttribute('class', 'overpass-description');
    tagTable.appendChild(overpassSubtitle);

    var newLine = document.createElement("br");
    tagTable.appendChild(newLine);

    // Formular cells
    var lineForm = document.createElement('form-inline');
    lineForm.setAttribute('id', 'tag-table');
    lineForm.setAttribute('class', 'overpass-tag-table');

    // Key cell
    var keyelement = document.createElement('input');
    keyelement.setAttribute('id', 'key-cell');
    keyelement.setAttribute('class', 'overpass-tag');
    keyelement.setAttribute('type', 'texte');
    keyelement.setAttribute('value', 'amenity');
    lineForm.appendChild(keyelement);

    // Value cell
    var valueelement = document.createElement('input');
    valueelement.setAttribute('id', 'value-cell');
    valueelement.setAttribute('class', 'overpass-value');
    valueelement.setAttribute('type', 'texte');
    valueelement.setAttribute('value', 'pharmacy');
    lineForm.appendChild(valueelement);

    tagTable.appendChild(lineForm);

    // Description
    var overpassDescription = document.createElement('text');
    var amenity_text = 'amenity'
    overpassDescription.innerHTML = 'More values for ' + amenity_text.link('https://wiki.openstreetmap.org/wiki/Key:amenity') + '.';
    tagTable.appendChild(overpassDescription);

    var newLine = document.createElement("br");
    tagTable.appendChild(newLine);

    // Submit button
    var submitelement = document.createElement('input');
    submitelement.setAttribute('id', 'button-request');
    submitelement.setAttribute('class', 'overpass-button');
    submitelement.setAttribute('type', 'button');
    submitelement.setAttribute('value', 'Add');

    // Call overpass
    submitelement.onclick = function (e) {
      if (map.getZoom() < 9) {
        alert("The area is too large, please zoom in.");
        return;
      }
      L.DomEvent.stopPropagation(e);
      document.getElementById('wait-icon').setAttribute('class', 'wait-icon');
      panelControl.hideOverpassButton();
      map.fireEvent('overpass');
    };

    tagTable.appendChild(submitelement);
    overpassForm.appendChild(tagTable);
    this._overpassDiv.appendChild(overpassForm);
  },

  toggle: function () {
    var LSetup = require('../config/leaflet_setup');
    var mapEl = document.getElementById('map');

    if (this._div.classList.contains('panel-collapsed')) {
      // Show sidebar
      this._div.classList.remove('panel-collapsed');
      if (mapEl) mapEl.classList.remove('map-expanded');
      if (mapEl) mapEl.style.right = '300px';
    } else {
      // Hide sidebar
      this._div.classList.add('panel-collapsed');
      if (mapEl) mapEl.classList.add('map-expanded');
      if (mapEl) mapEl.style.right = '0';
    }

    // Tell Leaflet to recalculate its size after layout change
    setTimeout(function() {
      LSetup.map.invalidateSize({ animate: true });
    }, 50);
  },

  togglePdpMode: function () {
    var data = require('../data');
    if (data.pdpMode) {
      this.disablePdpMode();
    } else {
      this.enablePdpMode();
    }
  },

  enablePdpMode: function () {
    var data = require('../data');
    var LSetup = require('../config/leaflet_setup');
    data.pdpMode = true;
    data.pdpState = 'waiting_for_pickup';

    // Show instruction banner
    var banner = document.getElementById('pdp-instruction');
    if (banner) {
      banner.style.display = 'flex';
    }
    var text = document.getElementById('pdp-instruction-text');
    if (text) {
      text.innerText = "Click on the map to set the Pickup location";
    }

    // Update button style
    if (this._pdpBtn) {
      this._pdpBtn.classList.add('active');
      this._pdpBtn.innerText = "Cancel Add Shipment";
    }
  },

  disablePdpMode: function () {
    var data = require('../data');
    var LSetup = require('../config/leaflet_setup');
    data.pdpMode = false;
    data.pdpState = 'idle';
    data.currentPickupLoc = null;

    // Remove temp marker
    if (data.tempPickupMarker) {
      LSetup.map.removeLayer(data.tempPickupMarker);
      delete data.tempPickupMarker;
    }

    // Hide instruction banner
    var banner = document.getElementById('pdp-instruction');
    if (banner) {
      banner.style.display = 'none';
    }

    // Update button style
    if (this._pdpBtn) {
      this._pdpBtn.classList.remove('active');
      this._pdpBtn.innerText = "Add Shipment (P&D)";
    }
  },

  updateInputsVisibility: function () {
    var data = require('../data');

    // Show/hide Add Shipment button
    if (this._pdpBtn) {
      this._pdpBtn.style.display = (data.activeTab === 'pdp' || data.activeTab === 'custom') ? 'block' : 'none';
    }

    // Toggle existing input rows
    var capacityRows = document.querySelectorAll('.row-capacity');
    var twRows = document.querySelectorAll('.row-timewindow');
    var fuelRows = document.querySelectorAll('.row-fuel');

    capacityRows.forEach(function (row) {
      row.style.display = (data.activeTab === 'cvrp' || data.activeTab === 'custom' || data.activeTab === 'pdp') ? 'flex' : 'none';
    });

    twRows.forEach(function (row) {
      row.style.display = (data.activeTab === 'vrptw' || data.activeTab === 'custom' || data.activeTab === 'pdp') ? 'flex' : 'none';
    });

    fuelRows.forEach(function (row) {
      row.style.display = (data.activeTab === 'cvrp' || data.activeTab === 'vrptw' || data.activeTab === 'custom') ? 'flex' : 'none';
    });
  },

  getWidth: function () {
    var width = this._div.offsetWidth;
    if (this._div.style.visibility == 'hidden') {
      width = 0;
    }
    return width;
  }
});

var panelControl = new panelControl();

module.exports = panelControl;
