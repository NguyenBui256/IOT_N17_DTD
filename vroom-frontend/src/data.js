'use strict';

var jobs = [];
var shipments = [];
var vehicles = [];

// Stored with type and task id as key, e.g. markers['job']['14'].
var markers = {
  'job': {},
  'pickup': {},
  'delivery': {}
};

// Stored with vehicle id + {_start,_end} as key
var vehiclesMarkers = {};

var maxTaskId = 0;
var maxVehicleId = 0;

// Store segments to match pickup and delivery, indexed in the form
// 'p.id-d.id'.
var pdLines = {};

var activeTab = 'cvrp'; // Default tab
var pdpMode = false;
var pdpState = 'idle'; // 'idle', 'waiting_for_pickup', 'waiting_for_delivery'
var currentPickupLoc = null;

module.exports = {
  jobs: jobs,
  shipments: shipments,
  maxTaskId: maxTaskId,
  maxVehicleId: maxVehicleId,
  vehicles: vehicles,
  markers: markers,
  vehiclesMarkers: vehiclesMarkers,
  pdLines: pdLines,
  activeTab: activeTab,
  pdpMode: pdpMode,
  pdpState: pdpState,
  currentPickupLoc: currentPickupLoc
};
