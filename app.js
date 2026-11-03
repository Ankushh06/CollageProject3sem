/**
 * RouteFlow - Simplified Route Optimization System
 * Pure C++14 ADS Engine + Dijkstra Algorithm + Canvas Map
 */

const COST_PER_KM = 10; // ₹10 per km

const FALLBACK_LOCATIONS = [
  { id: 0, name: 'Warehouse', type: 'WAREHOUSE', x: 160, y: 240 },
  { id: 1, name: 'Market', type: 'CUSTOMER', x: 340, y: 200 },
  { id: 2, name: 'Hospital', type: 'CUSTOMER', x: 310, y: 80 },
  { id: 3, name: 'University', type: 'CUSTOMER', x: 490, y: 80 },
  { id: 4, name: 'Railway Station', type: 'LANDMARK', x: 320, y: 390 },
  { id: 5, name: 'Mall', type: 'CUSTOMER', x: 570, y: 210 },
  { id: 6, name: 'Airport', type: 'LANDMARK', x: 760, y: 130 },
  { id: 7, name: 'Bus Stand', type: 'LANDMARK', x: 150, y: 380 },
  { id: 8, name: 'Old City', type: 'CUSTOMER', x: 230, y: 460 },
  { id: 9, name: 'Tech Park', type: 'CUSTOMER', x: 680, y: 260 },
  { id: 10, name: 'Cargo Hub', type: 'WAREHOUSE', x: 130, y: 90 },
  { id: 11, name: 'City Center', type: 'CUSTOMER', x: 430, y: 270 },
  { id: 12, name: 'Financial District', type: 'CUSTOMER', x: 500, y: 370 },
  { id: 13, name: 'Port Terminal', type: 'LANDMARK', x: 840, y: 230 },
  { id: 14, name: 'Industrial Estate', type: 'WAREHOUSE', x: 660, y: 430 },
  { id: 15, name: 'Sports Complex', type: 'LANDMARK', x: 390, y: 490 },
  { id: 16, name: 'Metro Station', type: 'LANDMARK', x: 220, y: 310 },
  { id: 17, name: 'Eco Park', type: 'CUSTOMER', x: 790, y: 370 }
];

const FALLBACK_ROADS = [
  { roadId: 1, locA: 'Warehouse', locB: 'Market', distanceKm: 4.0, travelTimeMin: 12.0, isActive: true },
  { roadId: 2, locA: 'Warehouse', locB: 'Hospital', distanceKm: 7.0, travelTimeMin: 14.0, isActive: true },
  { roadId: 3, locA: 'Warehouse', locB: 'Bus Stand', distanceKm: 3.0, travelTimeMin: 10.0, isActive: true },
  { roadId: 4, locA: 'Market', locB: 'Hospital', distanceKm: 2.0, travelTimeMin: 8.0, isActive: true },
  { roadId: 5, locA: 'Market', locB: 'Old City', distanceKm: 5.0, travelTimeMin: 20.0, isActive: true },
  { roadId: 6, locA: 'Market', locB: 'Mall', distanceKm: 6.0, travelTimeMin: 15.0, isActive: true },
  { roadId: 7, locA: 'Hospital', locB: 'University', distanceKm: 4.0, travelTimeMin: 9.0, isActive: true },
  { roadId: 8, locA: 'Hospital', locB: 'Railway Station', distanceKm: 8.0, travelTimeMin: 22.0, isActive: true },
  { roadId: 9, locA: 'University', locB: 'Tech Park', distanceKm: 5.0, travelTimeMin: 11.0, isActive: true },
  { roadId: 10, locA: 'University', locB: 'Mall', distanceKm: 3.0, travelTimeMin: 10.0, isActive: true },
  { roadId: 11, locA: 'Railway Station', locB: 'Old City', distanceKm: 3.0, travelTimeMin: 12.0, isActive: true },
  { roadId: 12, locA: 'Railway Station', locB: 'Bus Stand', distanceKm: 6.0, travelTimeMin: 18.0, isActive: true },
  { roadId: 13, locA: 'Mall', locB: 'Tech Park', distanceKm: 4.0, travelTimeMin: 9.0, isActive: true },
  { roadId: 14, locA: 'Mall', locB: 'Airport', distanceKm: 11.0, travelTimeMin: 25.0, isActive: true },
  { roadId: 15, locA: 'Tech Park', locB: 'Airport', distanceKm: 9.0, travelTimeMin: 16.0, isActive: true },
  { roadId: 16, locA: 'Bus Stand', locB: 'Old City', distanceKm: 5.0, travelTimeMin: 15.0, isActive: true },
  { roadId: 17, locA: 'Cargo Hub', locB: 'Warehouse', distanceKm: 3.5, travelTimeMin: 8.0, isActive: true },
  { roadId: 18, locA: 'Cargo Hub', locB: 'Hospital', distanceKm: 4.5, travelTimeMin: 11.0, isActive: true },
  { roadId: 19, locA: 'Metro Station', locB: 'Warehouse', distanceKm: 2.5, travelTimeMin: 7.0, isActive: true },
  { roadId: 20, locA: 'Metro Station', locB: 'Market', distanceKm: 3.0, travelTimeMin: 8.0, isActive: true },
  { roadId: 21, locA: 'Metro Station', locB: 'Bus Stand', distanceKm: 2.0, travelTimeMin: 6.0, isActive: true },
  { roadId: 22, locA: 'Metro Station', locB: 'Railway Station', distanceKm: 3.5, travelTimeMin: 9.0, isActive: true },
  { roadId: 23, locA: 'City Center', locB: 'Market', distanceKm: 2.5, travelTimeMin: 7.0, isActive: true },
  { roadId: 24, locA: 'City Center', locB: 'Mall', distanceKm: 3.0, travelTimeMin: 8.0, isActive: true },
  { roadId: 25, locA: 'City Center', locB: 'Railway Station', distanceKm: 3.5, travelTimeMin: 10.0, isActive: true },
  { roadId: 26, locA: 'City Center', locB: 'University', distanceKm: 4.0, travelTimeMin: 10.0, isActive: true },
  { roadId: 27, locA: 'Financial District', locB: 'City Center', distanceKm: 2.0, travelTimeMin: 6.0, isActive: true },
  { roadId: 28, locA: 'Financial District', locB: 'Railway Station', distanceKm: 4.0, travelTimeMin: 11.0, isActive: true },
  { roadId: 29, locA: 'Financial District', locB: 'Mall', distanceKm: 4.5, travelTimeMin: 12.0, isActive: true },
  { roadId: 30, locA: 'Financial District', locB: 'Industrial Estate', distanceKm: 4.0, travelTimeMin: 10.0, isActive: true },
  { roadId: 31, locA: 'Sports Complex', locB: 'Railway Station', distanceKm: 3.0, travelTimeMin: 8.0, isActive: true },
  { roadId: 32, locA: 'Sports Complex', locB: 'Old City', distanceKm: 3.5, travelTimeMin: 10.0, isActive: true },
  { roadId: 33, locA: 'Sports Complex', locB: 'Financial District', distanceKm: 3.5, travelTimeMin: 9.0, isActive: true },
  { roadId: 34, locA: 'Industrial Estate', locB: 'Tech Park', distanceKm: 4.5, travelTimeMin: 12.0, isActive: true },
  { roadId: 35, locA: 'Industrial Estate', locB: 'Eco Park', distanceKm: 3.5, travelTimeMin: 9.0, isActive: true },
  { roadId: 36, locA: 'Industrial Estate', locB: 'Sports Complex', distanceKm: 6.0, travelTimeMin: 16.0, isActive: true },
  { roadId: 37, locA: 'Port Terminal', locB: 'Airport', distanceKm: 5.0, travelTimeMin: 10.0, isActive: true },
  { roadId: 38, locA: 'Port Terminal', locB: 'Tech Park', distanceKm: 4.0, travelTimeMin: 9.0, isActive: true },
  { roadId: 39, locA: 'Port Terminal', locB: 'Eco Park', distanceKm: 4.5, travelTimeMin: 11.0, isActive: true },
  { roadId: 40, locA: 'Eco Park', locB: 'Tech Park', distanceKm: 5.0, travelTimeMin: 12.0, isActive: true }
];

const state = {
  network: {
    criterion: 'DISTANCE',
    criterionName: 'Shortest DISTANCE (km)',
    locations: JSON.parse(JSON.stringify(FALLBACK_LOCATIONS)),
    roads: JSON.parse(JSON.stringify(FALLBACK_ROADS)),
    closedCount: 0
  },
  selectedSource: null,
  selectedDestination: null,
  selectedDepot: null,
  currentRoute: null,
  activePlannerSubmode: 'pointToPoint',
  // Canvas Viewport
  viewport: {
    x: 40,
    y: 30,
    zoom: 1.0,
    isPanning: false,
    panStart: { x: 0, y: 0 },
    hoveredNode: null,
    hoveredRoad: null,
    activePopupNode: null
  },
  // Animation
  animation: {
    active: false,
    paused: false,
    progress: 0,
    speed: 1.0,
    lastTime: 0
  }
};

const canvas = document.getElementById('networkCanvas');
const ctx = canvas.getContext('2d');
const canvasViewport = document.getElementById('canvasViewport');

// ----------------------------------------------------------------------------
//  INITIALIZATION
// ----------------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', async () => {
  setupCanvasDimensions();
  
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setupCanvasDimensions();
    }, 100);
  });

  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      setupCanvasDimensions();
      autoFitGraph();
    }, 200);
  });

  initEventListeners();
  initCanvasInteractions();

  await fetchNetwork();
  await fetchDatabaseInfo();

  // Set default sensible selections
  if (state.network.locations.length >= 2) {
    setStartLocation('Warehouse');
    setEndLocation('Airport');
  }

  startAnimationLoop();
  autoFitGraph();
});

function setupCanvasDimensions() {
  const rect = canvasViewport.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  requestRender();
}

// ----------------------------------------------------------------------------
//  API COMMUNICATION
// ----------------------------------------------------------------------------
async function apiGet(endpoint) {
  try {
    const res = await fetch(endpoint);
    if (!res.ok) {
      console.warn('API GET non-200 (' + endpoint + '):', res.status);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn('API GET fallback (' + endpoint + '):', err.message);
    return null;
  }
}

async function apiPost(endpoint, body) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      console.warn('API POST non-200 (' + endpoint + '):', res.status);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn('API POST fallback (' + endpoint + '):', err.message);
    return null;
  }
}

function saveClosedRoadsToStorage() {
  try {
    const closed = (state.network.roads || [])
      .filter(r => r.isActive === false || r.isActive === 'false' || r.isActive === 0)
      .map(r => ({ roadId: r.roadId, locA: r.locA, locB: r.locB }));
    localStorage.setItem('routeflow_closed_roads', JSON.stringify(closed));
  } catch (e) {
    // Ignore storage quota errors
  }
}

function loadClosedRoadsFromStorage() {
  try {
    const raw = localStorage.getItem('routeflow_closed_roads');
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch (e) {
    return [];
  }
}

function applyStoredClosedRoads() {
  const stored = loadClosedRoadsFromStorage();
  const roads = state.network.roads || [];
  if (stored && stored.length > 0) {
    stored.forEach(c => {
      roads.forEach(r => {
        const matchId = (c.roadId && r.roadId === c.roadId);
        const matchNames = (
          (r.locA.toLowerCase() === (c.locA || '').toLowerCase() && r.locB.toLowerCase() === (c.locB || '').toLowerCase()) ||
          (r.locA.toLowerCase() === (c.locB || '').toLowerCase() && r.locB.toLowerCase() === (c.locA || '').toLowerCase())
        );
        if (matchId || matchNames) {
          r.isActive = false;
        }
      });
    });
  }
  state.network.closedCount = roads.filter(r => !r.isActive).length;
}

function renderClosedRoadsList() {
  const list = document.getElementById('closedRoadsList');
  const countBadge = document.getElementById('closedRoadsCountBadge');
  const btnReopenAll = document.getElementById('btnReopenAllRoads');
  const quickSelect = document.getElementById('selectQuickCloseRoad');
  const roads = state.network.roads || [];

  const closed = roads.filter(r => r.isActive === false || r.isActive === 'false' || r.isActive === 0);
  if (countBadge) {
    countBadge.textContent = `${closed.length} Closed`;
    countBadge.classList.toggle('hidden', closed.length === 0);
  }
  if (btnReopenAll) {
    btnReopenAll.classList.toggle('hidden', closed.length === 0);
  }

  if (quickSelect) {
    const openRoads = roads.filter(r => r.isActive !== false && r.isActive !== 'false' && r.isActive !== 0);
    const prevVal = quickSelect.value;
    quickSelect.innerHTML = '<option value="">Select a road to close...</option>' +
      openRoads.map(r => `<option value="${r.roadId}">${escapeHtml(r.locA)} ⟷ ${escapeHtml(r.locB)} (${r.distanceKm.toFixed(1)} km)</option>`).join('');
    if (prevVal) quickSelect.value = prevVal;
  }

  if (!list) return;

  if (closed.length === 0) {
    list.innerHTML = '<div class="text-[11px] text-slate-500 italic py-1 text-center">No roads currently closed. Click any road on map to block.</div>';
    return;
  }

  list.innerHTML = closed.map(r => `
    <div class="flex items-center justify-between p-1.5 px-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs">
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="text-rose-400">⛔</span>
        <span class="font-semibold text-rose-200 truncate">${escapeHtml(r.locA)} ⟷ ${escapeHtml(r.locB)}</span>
        <span class="text-[10px] text-slate-400 font-mono">${r.distanceKm.toFixed(1)}km</span>
      </div>
      <button type="button" class="btn-reopen-single text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition font-heading font-semibold"
              data-from="${escapeHtml(r.locA)}" data-to="${escapeHtml(r.locB)}" data-id="${r.roadId}">
        Reopen
      </button>
    </div>
  `).join('');

  list.querySelectorAll('.btn-reopen-single').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const from = btn.getAttribute('data-from');
      const to = btn.getAttribute('data-to');
      await toggleRoadState(from, to, true);
    });
  });
}

async function fetchNetwork() {
  const data = await apiGet('/api/network');
  if (data && data.locations) {
    state.network = data;
  } else if (!state.network.locations || state.network.locations.length === 0) {
    state.network.locations = JSON.parse(JSON.stringify(FALLBACK_LOCATIONS));
    state.network.roads = JSON.parse(JSON.stringify(FALLBACK_ROADS));
  }

  // Ensure stored road closures are retained across stateless serverless invocations
  applyStoredClosedRoads();

  const isDist = state.network.criterion === 'DISTANCE';
  document.getElementById('btnModeDistance').classList.toggle('active', isDist);
  document.getElementById('btnModeTime').classList.toggle('active', !isDist);

  renderLocationChips();
  populateStopsCheckboxes();
  renderClosedRoadsList();
  requestRender();
}

// ----------------------------------------------------------------------------
//  VISUAL LOCATION CHIPS
// ----------------------------------------------------------------------------
function renderLocationChips() {
  const locs = state.network.locations || [];
  const srcContainer = document.getElementById('chipsSource');
  const dstContainer = document.getElementById('chipsDestination');
  const depotContainer = document.getElementById('chipsDepot');

  const buildChips = (selectedName, type) => {
    return locs.map(l => {
      const isSelected = (l.name === selectedName);
      const icon = l.type === 'WAREHOUSE' ? '🏢' : l.type === 'LANDMARK' ? '🏛️' : '🛒';
      const selClass = isSelected ? (type === 'source' || type === 'depot' ? 'selected-source' : 'selected-dest') : '';
      return `<div class="loc-chip ${selClass}" data-name="${escapeHtml(l.name)}" data-type="${type}">
        <span>${icon}</span> <span>${escapeHtml(l.name)}</span>
      </div>`;
    }).join('');
  };

  srcContainer.innerHTML = buildChips(state.selectedSource, 'source');
  dstContainer.innerHTML = buildChips(state.selectedDestination, 'dest');
  depotContainer.innerHTML = buildChips(state.selectedDepot || 'Warehouse', 'depot');

  // Attach chip click listeners
  srcContainer.querySelectorAll('.loc-chip').forEach(c => {
    c.addEventListener('click', () => setStartLocation(c.getAttribute('data-name')));
  });
  dstContainer.querySelectorAll('.loc-chip').forEach(c => {
    c.addEventListener('click', () => setEndLocation(c.getAttribute('data-name')));
  });
  depotContainer.querySelectorAll('.loc-chip').forEach(c => {
    c.addEventListener('click', () => setDepotLocation(c.getAttribute('data-name')));
  });
}

function setStartLocation(name) {
  state.selectedSource = name;
  document.getElementById('selectSource').value = name;
  renderLocationChips();
  updateHudText(`Start point set to ${name}. Now pick a destination!`);
  requestRender();
}

function setEndLocation(name) {
  state.selectedDestination = name;
  document.getElementById('selectDestination').value = name;
  renderLocationChips();
  updateHudText(`Destination set to ${name}. Ready to calculate!`);
  requestRender();
}

function setDepotLocation(name) {
  state.selectedDepot = name;
  document.getElementById('selectDepot').value = name;
  renderLocationChips();
  populateStopsCheckboxes();
  updateHudText(`Starting depot set to ${name}`);
  requestRender();
}

function populateStopsCheckboxes() {
  const locs = state.network.locations || [];
  const container = document.getElementById('stopsCheckboxList');
  const depotName = state.selectedDepot || 'Warehouse';

  let html = '';
  locs.forEach(l => {
    if (l.name === depotName) return;
    const icon = l.type === 'WAREHOUSE' ? '🏢' : l.type === 'LANDMARK' ? '🏛️' : '🛒';
    html += `
      <label class="stop-toggle-card">
        <input type="checkbox" name="deliveryStop" value="${escapeHtml(l.name)}">
        <span>${icon} ${escapeHtml(l.name)}</span>
      </label>
    `;
  });
  container.innerHTML = html;

  // Click card toggles checked state
  container.querySelectorAll('.stop-toggle-card').forEach(card => {
    const input = card.querySelector('input');
    input.addEventListener('change', () => {
      card.classList.toggle('checked', input.checked);
    });
  });
}

async function toggleRoadState(from, to, newActiveState) {
  const normA = (from || '').trim().toLowerCase();
  const normB = (to || '').trim().toLowerCase();

  // 1. Immediately update client-side state optimistically
  const roads = state.network.roads || [];
  let targetRoad = null;
  roads.forEach(r => {
    const ra = (r.locA || '').trim().toLowerCase();
    const rb = (r.locB || '').trim().toLowerCase();
    if ((ra === normA && rb === normB) || (ra === normB && rb === normA)) {
      r.isActive = Boolean(newActiveState);
      targetRoad = r;
    }
  });

  const statusText = newActiveState ? 'REOPENED' : 'CLOSED';

  if (targetRoad) {
    state.network.closedCount = roads.filter(r => r.isActive === false || r.isActive === 'false' || r.isActive === 0).length;
    saveClosedRoadsToStorage();
    renderClosedRoadsList();
    showToast(`Road ${targetRoad.locA} ⟷ ${targetRoad.locB} is now ${statusText}!`, newActiveState ? 'success' : 'error');
    updateHudText(`Road ${targetRoad.locA} ⟷ ${targetRoad.locB} ${statusText}. Recalculating path...`);
    requestRender();
  }

  // 2. Sync with backend API
  try {
    await apiPost('/api/roads/toggle', { from, to, active: Boolean(newActiveState) });
  } catch (err) {
    console.warn('Backend road toggle sync deferred (client active):', err.message);
  }

  // 3. Recalculate route if one was displayed
  if (state.currentRoute) {
    if (state.activePlannerSubmode === 'pointToPoint') calculatePointToPoint();
    else calculateMultiStop();
  }
}

async function reopenAllRoads() {
  const roads = state.network.roads || [];
  roads.forEach(r => { r.isActive = true; });
  state.network.closedCount = 0;
  saveClosedRoadsToStorage();
  renderClosedRoadsList();
  showToast('All closed roads have been reopened!', 'success');
  updateHudText('All roads reopened. Recalculating routes...');
  requestRender();

  try {
    await apiPost('/api/roads/reopen-all', {});
  } catch (e) {
    // ignore
  }

  if (state.currentRoute) {
    if (state.activePlannerSubmode === 'pointToPoint') calculatePointToPoint();
    else calculateMultiStop();
  }
}

// ----------------------------------------------------------------------------
//  ROUTE PLANNING & TURN-BY-TURN
// ----------------------------------------------------------------------------
async function calculatePointToPoint() {
  const source = state.selectedSource;
  const destination = state.selectedDestination;

  if (!source || !destination) {
    showToast('Please select both a Start and Destination point', 'info');
    return;
  }
  if (source === destination) {
    showToast('Start and Destination must be different', 'info');
    return;
  }

  updateHudText(`Calculating shortest route: ${source} ➔ ${destination}...`);

  // Collect closed roads from client state to ensure no closed roads are used
  const closedRoads = (state.network.roads || [])
    .filter(r => r.isActive === false || r.isActive === 'false' || r.isActive === 0)
    .map(r => ({ roadId: r.roadId, from: r.locA, to: r.locB }));

  let res = await apiPost('/api/route', {
    source,
    destination,
    criterion: state.network.criterion,
    closedRoads
  });

  // Verify server route strictly does not traverse any closed road
  const isServerRouteViolatingClosure = (routeRes) => {
    if (!routeRes || !routeRes.valid || !routeRes.routeNames) return false;
    const names = routeRes.routeNames;
    for (let i = 0; i + 1 < names.length; i++) {
      const u = names[i].toLowerCase();
      const v = names[i + 1].toLowerCase();
      const isClosed = closedRoads.some(cr =>
        (cr.from.toLowerCase() === u && cr.to.toLowerCase() === v) ||
        (cr.from.toLowerCase() === v && cr.to.toLowerCase() === u)
      );
      if (isClosed) return true;
    }
    return false;
  };

  if (!res || !res.valid || isServerRouteViolatingClosure(res)) {
    // Client-side Dijkstra fallback guaranteed to respect all road closures
    res = clientDijkstra(source, destination, state.network.criterion);
  }

  if (res && res.valid) {
    displayRouteResult(res);
    startRouteAnimation(res);
    updateHudText(`Optimal Route: ${res.km.toFixed(1)} km in ${res.minutes.toFixed(0)} min`);
    showToast(`Optimal route found: ${res.km.toFixed(1)} km in ${res.minutes.toFixed(0)} min`, 'success');
    if (window.innerWidth < 768 && window.setMobileView) {
      window.setMobileView('map');
    }
  } else {
    showToast(`No open road path exists between ${source} and ${destination}!`, 'error');
    updateHudText(`No route found! Try reopening roads.`);
    clearRouteResult();
  }
}

async function calculateMultiStop() {
  const depot = state.selectedDepot || 'Warehouse';
  const checkboxes = document.querySelectorAll('input[name="deliveryStop"]:checked');
  const stops = Array.from(checkboxes).map(c => c.value);
  const returnToDepot = document.getElementById('chkReturnDepot').checked;

  if (stops.length === 0) {
    showToast('Select at least one customer delivery stop', 'info');
    return;
  }

  updateHudText(`Optimizing multi-stop delivery tour for ${stops.length} stops...`);

  // Collect closed roads from client state
  const closedRoads = (state.network.roads || [])
    .filter(r => r.isActive === false || r.isActive === 'false' || r.isActive === 0)
    .map(r => ({ roadId: r.roadId, from: r.locA, to: r.locB }));

  let res = await apiPost('/api/plan', {
    depot,
    stops,
    returnToDepot,
    criterion: state.network.criterion,
    closedRoads
  });

  const isServerTourViolatingClosure = (tourRes) => {
    if (!tourRes || !tourRes.valid || !tourRes.routeNames) return false;
    const names = tourRes.routeNames;
    for (let i = 0; i + 1 < names.length; i++) {
      const u = names[i].toLowerCase();
      const v = names[i + 1].toLowerCase();
      const isClosed = closedRoads.some(cr =>
        (cr.from.toLowerCase() === u && cr.to.toLowerCase() === v) ||
        (cr.from.toLowerCase() === v && cr.to.toLowerCase() === u)
      );
      if (isClosed) return true;
    }
    return false;
  };

  if (!res || !res.valid || isServerTourViolatingClosure(res)) {
    // Client-side TSP fallback guaranteed to respect all closures
    res = clientPlanTSP(depot, stops, returnToDepot, state.network.criterion);
  }

  if (res && res.valid) {
    displayRouteResult(res);
    startRouteAnimation(res);
    updateHudText(`Multi-stop tour: ${res.order.length} stops, ${res.km.toFixed(1)} km`);
    showToast(`Multi-stop route optimized: ${res.order.length} stops, ${res.km.toFixed(1)} km`, 'success');
    if (window.innerWidth < 768 && window.setMobileView) {
      window.setMobileView('map');
    }
  } else {
    showToast('Could not calculate multi-stop route. Check road closures.', 'error');
    clearRouteResult();
  }
}

// ----------------------------------------------------------------------------
//  CLIENT-SIDE DIJKSTRA & TSP GRAPH ENGINE (Fallback)
// ----------------------------------------------------------------------------
function clientDijkstra(srcName, dstName, criterion = 'DISTANCE') {
  const isTime = (criterion === 'TIME');
  const locs = state.network.locations || [];
  const roads = state.network.roads || [];

  const locMap = new Map();
  locs.forEach(l => locMap.set(l.name.toLowerCase(), l));

  const srcLoc = locMap.get(srcName.trim().toLowerCase());
  const dstLoc = locMap.get(dstName.trim().toLowerCase());
  if (!srcLoc || !dstLoc) return { valid: false };

  const adj = new Map();
  locs.forEach(l => adj.set(l.name, []));

  roads.forEach(r => {
    if (r.isActive === false || r.isActive === 'false' || r.isActive === 0) return;
    const w = isTime ? r.travelTimeMin : r.distanceKm;
    if (adj.has(r.locA)) adj.get(r.locA).push({ to: r.locB, cost: w, km: r.distanceKm, min: r.travelTimeMin });
    if (adj.has(r.locB)) adj.get(r.locB).push({ to: r.locA, cost: w, km: r.distanceKm, min: r.travelTimeMin });
  });

  const dist = {};
  const parent = {};
  const legInfo = {};
  locs.forEach(l => {
    dist[l.name] = Infinity;
    parent[l.name] = null;
  });

  dist[srcLoc.name] = 0;
  const pq = [{ node: srcLoc.name, cost: 0 }];

  while (pq.length > 0) {
    pq.sort((a, b) => a.cost - b.cost);
    const { node: u, cost: d } = pq.shift();
    if (d > dist[u]) continue;
    if (u === dstLoc.name) break;

    const edges = adj.get(u) || [];
    for (const e of edges) {
      const nd = d + e.cost;
      if (nd < dist[e.to]) {
        dist[e.to] = nd;
        parent[e.to] = u;
        legInfo[`${u}->${e.to}`] = { km: e.km, min: e.min };
        pq.push({ node: e.to, cost: nd });
      }
    }
  }

  if (dist[dstLoc.name] === Infinity) {
    return { valid: false, depot: srcLoc.name, destination: dstLoc.name };
  }

  const path = [];
  let cur = dstLoc.name;
  while (cur != null) {
    path.push(cur);
    cur = parent[cur];
  }
  path.reverse();

  let totalKm = 0;
  let totalMin = 0;
  const legs = [];
  const fullRouteIds = [];

  for (let i = 0; i < path.length; i++) {
    const loc = locMap.get(path[i].toLowerCase());
    if (loc) fullRouteIds.push(loc.id);

    if (i + 1 < path.length) {
      const u = path[i];
      const v = path[i + 1];
      const info = legInfo[`${u}->${v}`] || legInfo[`${v}->${u}`] || { km: 0, min: 0 };
      totalKm += info.km;
      totalMin += info.min;
      legs.push({ from: u, to: v, km: info.km, min: info.min });
    }
  }

  return {
    valid: true,
    depot: srcLoc.name,
    destination: dstLoc.name,
    km: totalKm,
    minutes: totalMin,
    fullRoute: fullRouteIds,
    routeNames: path,
    routeText: path.join(' -> '),
    legs
  };
}

function clientPlanTSP(depotName, stops, returnToDepot = true, criterion = 'DISTANCE') {
  if (!stops || stops.length === 0) return { valid: false };

  const unvisited = [...new Set(stops.filter(s => s !== depotName))];
  if (unvisited.length === 0) return { valid: false };

  let current = depotName;
  const visitOrder = [];
  const fullPath = [depotName];
  let totalKm = 0;
  let totalMin = 0;
  const legs = [];

  while (unvisited.length > 0) {
    let nearestIdx = -1;
    let bestPlan = null;
    let minCost = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const sub = clientDijkstra(current, unvisited[i], criterion);
      if (sub.valid) {
        const cost = (criterion === 'TIME') ? sub.minutes : sub.km;
        if (cost < minCost) {
          minCost = cost;
          nearestIdx = i;
          bestPlan = sub;
        }
      }
    }

    if (nearestIdx === -1 || !bestPlan) {
      return { valid: false, error: `Could not reach remaining stops from ${current}` };
    }

    const nextStop = unvisited.splice(nearestIdx, 1)[0];
    visitOrder.push(nextStop);

    for (let i = 1; i < bestPlan.routeNames.length; i++) {
      fullPath.push(bestPlan.routeNames[i]);
    }
    totalKm += bestPlan.km;
    totalMin += bestPlan.minutes;
    legs.push(...bestPlan.legs);
    current = nextStop;
  }

  if (returnToDepot) {
    const returnPlan = clientDijkstra(current, depotName, criterion);
    if (returnPlan.valid) {
      for (let i = 1; i < returnPlan.routeNames.length; i++) {
        fullPath.push(returnPlan.routeNames[i]);
      }
      totalKm += returnPlan.km;
      totalMin += returnPlan.minutes;
      legs.push(...returnPlan.legs);
      visitOrder.push(depotName);
    }
  }

  const locMap = new Map();
  (state.network.locations || []).forEach(l => locMap.set(l.name.toLowerCase(), l.id));
  const fullRouteIds = fullPath.map(n => locMap.get(n.toLowerCase())).filter(id => id != null);

  return {
    valid: true,
    depot: depotName,
    order: visitOrder,
    km: totalKm,
    minutes: totalMin,
    fullRoute: fullRouteIds,
    routeNames: fullPath,
    routeText: fullPath.join(' -> '),
    legs
  };
}

function displayRouteResult(routeData) {
  state.currentRoute = routeData;
  const card = document.getElementById('routeResultCard');
  card.classList.remove('hidden');

  document.getElementById('resultModeBadge').textContent = state.network.criterion;
  document.getElementById('resTotalKm').textContent = routeData.km.toFixed(1);
  document.getElementById('resTotalMin').textContent = routeData.minutes.toFixed(0) + 'm';
  document.getElementById('resLegsCount').textContent = routeData.legs ? routeData.legs.length : (routeData.fullRoute.length - 1);

  // Total Cost calculation
  const totalCost = Math.round(routeData.km * COST_PER_KM);
  document.getElementById('resTotalCost').textContent = '₹' + totalCost;

  // Turn-by-Turn Timeline
  const timeline = document.getElementById('resTurnTimeline');
  let timelineHtml = '';

  if (routeData.legs && routeData.legs.length > 0) {
    timelineHtml += `
      <div class="timeline-step">
        <div class="step-marker start">🚩</div>
        <div class="step-body">
          <div class="step-heading">Depart: ${escapeHtml(routeData.legs[0].from)}</div>
          <div class="step-sub">Starting hub • 0.0 km</div>
        </div>
      </div>
    `;

    routeData.legs.forEach((leg, i) => {
      const isLast = (i === routeData.legs.length - 1);
      timelineHtml += `
        <div class="timeline-step">
          <div class="step-marker ${isLast ? 'end' : 'leg'}">${isLast ? '🏁' : '➔'}</div>
          <div class="step-body">
            <div class="step-heading">${isLast ? 'Arrive Destination:' : 'Drive towards:'} ${escapeHtml(leg.to)}</div>
            <div class="step-sub">${leg.km.toFixed(1)} km • ~${leg.min.toFixed(0)} min travel</div>
          </div>
        </div>
      `;
    });
  }
  timeline.innerHTML = timelineHtml;
  requestRender();
}

function clearRouteResult() {
  state.currentRoute = null;
  document.getElementById('routeResultCard').classList.add('hidden');
  stopRouteAnimation();
  updateHudText('Route cleared. Click any node to plan a new route.');
  requestRender();
}

// ----------------------------------------------------------------------------
//  FLOATING NODE CONTEXT POPUP
// ----------------------------------------------------------------------------
function showNodePopup(node) {
  state.viewport.activePopupNode = node;
  const popup = document.getElementById('nodeContextPopup');

  // Convert node world coords to screen coords
  const screenX = state.viewport.x + node.x * state.viewport.zoom;
  const screenY = state.viewport.y + node.y * state.viewport.zoom;

  document.getElementById('popupName').textContent = node.name;
  document.getElementById('popupType').textContent = node.type;
  document.getElementById('popupIcon').textContent = node.type === 'WAREHOUSE' ? '🏢' : node.type === 'LANDMARK' ? '🏛️' : '🛒';

  // Connected roads
  const connections = state.network.roads.filter(r => (r.locA === node.name || r.locB === node.name) && r.isActive);
  const connHtml = connections.length === 0 ? 'No open connections' :
    '<strong>Connected to:</strong><br>' +
    connections.map(r => {
      const other = r.locA === node.name ? r.locB : r.locA;
      return `• ${escapeHtml(other)} (${r.distanceKm.toFixed(1)} km, ${r.travelTimeMin.toFixed(0)}m)`;
    }).join('<br>');
  document.getElementById('popupConnections').innerHTML = connHtml;

  popup.style.visibility = 'hidden';
  popup.classList.remove('hidden');

  const popupW = Math.min(270, window.innerWidth - 32);
  const popupH = popup.offsetHeight || 170;
  let px = screenX - popupW / 2;
  let py = screenY - popupH - 16;

  // Horizontal clamping within viewport
  px = Math.max(12, Math.min(px, canvasViewport.clientWidth - popupW - 12));

  // Vertical clamping: if too close to top, show below node
  if (py < 56) {
    py = Math.min(screenY + 24, canvasViewport.clientHeight - popupH - 16);
  }

  popup.style.left = `${Math.round(px)}px`;
  popup.style.top = `${Math.round(py)}px`;
  popup.style.visibility = 'visible';
}

function hideNodePopup() {
  state.viewport.activePopupNode = null;
  document.getElementById('nodeContextPopup').classList.add('hidden');
}

// ----------------------------------------------------------------------------
//  CANVAS RENDERING & ANIMATION
// ----------------------------------------------------------------------------
let renderRequested = false;
function requestRender() {
  if (!renderRequested) {
    renderRequested = true;
    requestAnimationFrame(() => {
      renderRequested = false;
      renderCanvas();
    });
  }
}

function renderCanvas() {
  const rect = canvasViewport.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(state.viewport.x, state.viewport.y);
  ctx.scale(state.viewport.zoom, state.viewport.zoom);

  drawGrid(rect.width, rect.height);
  drawRoads();
  if (state.currentRoute && state.currentRoute.valid) {
    drawVehicleAnimation();
  }
  drawNodes();

  ctx.restore();
}

function drawGrid(w, h) {
  const step = 60;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  const startX = -state.viewport.x / state.viewport.zoom - 100;
  const startY = -state.viewport.y / state.viewport.zoom - 100;
  const endX = startX + w / state.viewport.zoom + 200;
  const endY = startY + h / state.viewport.zoom + 200;

  ctx.beginPath();
  for (let x = Math.floor(startX / step) * step; x < endX; x += step) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = Math.floor(startY / step) * step; y < endY; y += step) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawRoads() {
  const roads = state.network.roads || [];
  const locs = state.network.locations || [];
  const routePath = state.currentRoute ? (state.currentRoute.fullRoute || []) : [];

  const isSegmentInRoute = (nameA, nameB) => {
    if (routePath.length < 2) return false;
    for (let i = 0; i + 1 < routePath.length; i++) {
      const u = locs[routePath[i]];
      const v = locs[routePath[i + 1]];
      if (!u || !v) continue;
      if ((u.name === nameA && v.name === nameB) || (u.name === nameB && v.name === nameA)) return true;
    }
    return false;
  };

  roads.forEach(r => {
    const a = locs.find(l => l.name === r.locA);
    const b = locs.find(l => l.name === r.locB);
    if (!a || !b) return;

    const inRoute = isSegmentInRoute(r.locA, r.locB);
    const isClosed = (r.isActive === false || r.isActive === 'false' || r.isActive === 0);
    const isHovered = (state.viewport.hoveredRoad === r);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);

    if (isClosed) {
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = isHovered ? 4 : 2.5;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
    } else if (inRoute) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 6;
      ctx.shadowColor = 'rgba(16, 185, 129, 0.8)';
      ctx.shadowBlur = 14;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = '#a7f3d0';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 0;
      ctx.stroke();
    } else {
      ctx.strokeStyle = isHovered ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = isHovered ? 4 : 2;
      ctx.stroke();
    }
    ctx.restore();

    // Road Middle Badge
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;

    ctx.save();
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = isClosed ? '⛔ CLOSED' : `${r.distanceKm.toFixed(1)}k / ${r.travelTimeMin.toFixed(0)}m`;
    const tagW = ctx.measureText(text).width + 12;
    const tagH = 18;

    ctx.fillStyle = isClosed ? 'rgba(244, 63, 94, 0.25)' : inRoute ? 'rgba(16, 185, 129, 0.25)' : 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = isClosed ? '#f43f5e' : inRoute ? '#10b981' : isHovered ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = isHovered ? 2 : 1;

    ctx.beginPath();
    roundRect(ctx, midX - tagW / 2, midY - tagH / 2, tagW, tagH, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isClosed ? '#f43f5e' : inRoute ? '#6ee7b7' : isHovered ? '#ffffff' : '#94a3b8';
    ctx.fillText(text, midX, midY + 1);
    ctx.restore();
  });
}

function drawNodes() {
  const locs = state.network.locations || [];
  const routePath = state.currentRoute ? (state.currentRoute.fullRoute || []) : [];

  locs.forEach(node => {
    const isStart = (node.name === state.selectedSource);
    const isEnd = (node.name === state.selectedDestination);
    const isInRoute = routePath.includes(node.id);
    const isHovered = (state.viewport.hoveredNode && state.viewport.hoveredNode.id === node.id);

    const radius = isStart || isEnd ? 22 : isInRoute ? 18 : 16;

    ctx.save();
    // Halo Glow
    if (isStart || isEnd || isHovered || isInRoute) {
      ctx.shadowColor = isStart ? 'rgba(16, 185, 129, 0.9)' : isEnd ? 'rgba(6, 182, 212, 0.9)' : 'rgba(56, 189, 248, 0.7)';
      ctx.shadowBlur = 20;
    }

    // Node Circle Fill
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

    let grad = ctx.createRadialGradient(node.x - 4, node.y - 4, 2, node.x, node.y, radius);
    if (node.type === 'WAREHOUSE') {
      grad.addColorStop(0, '#fde68a');
      grad.addColorStop(1, '#b45309');
    } else if (node.type === 'LANDMARK') {
      grad.addColorStop(0, '#ddd6fe');
      grad.addColorStop(1, '#6d28d9');
    } else {
      grad.addColorStop(0, '#a5f3fc');
      grad.addColorStop(1, '#0369a1');
    }
    ctx.fillStyle = grad;
    ctx.fill();

    // Ring Outline
    ctx.strokeStyle = isStart ? '#10b981' : isEnd ? '#00f0ff' : '#ffffff';
    ctx.lineWidth = isStart || isEnd || isHovered ? 3 : 1.5;
    ctx.stroke();
    ctx.restore();

    // Emoji Icon
    ctx.save();
    ctx.font = `${Math.floor(radius * 0.9)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icon = node.type === 'WAREHOUSE' ? '🏢' : node.type === 'LANDMARK' ? '🏛️' : '🛒';
    ctx.fillText(icon, node.x, node.y + 1);
    ctx.restore();

    // Node Label Card
    ctx.save();
    ctx.font = '600 11px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    const labelY = node.y + radius + 13;
    const labelText = (isStart ? '🚩 ' : isEnd ? '🏁 ' : '') + node.name;
    const labelW = ctx.measureText(labelText).width + 14;

    ctx.fillStyle = 'rgba(7, 10, 19, 0.9)';
    ctx.strokeStyle = isStart ? '#10b981' : isEnd ? '#06b6d4' : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    roundRect(ctx, node.x - labelW / 2, labelY - 9, labelW, 18, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isStart ? '#34d399' : isEnd ? '#38bdf8' : '#f8fafc';
    ctx.fillText(labelText, node.x, labelY + 3);
    ctx.restore();
  });
}

function drawVehicleAnimation() {
  const route = state.currentRoute;
  if (!route || !route.fullRoute || route.fullRoute.length < 2) return;

  const locs = state.network.locations;
  const path = route.fullRoute.map(id => locs[id]).filter(Boolean);
  if (path.length < 2) return;

  let totalLen = 0;
  const lengths = [];
  for (let i = 0; i + 1 < path.length; i++) {
    const len = Math.hypot(path[i+1].x - path[i].x, path[i+1].y - path[i].y);
    lengths.push(len);
    totalLen += len;
  }
  if (totalLen === 0) return;

  const curDist = (state.animation.progress % 1) * totalLen;
  let accum = 0;
  let pos = { x: path[0].x, y: path[0].y, angle: 0 };

  for (let i = 0; i < lengths.length; i++) {
    if (accum + lengths[i] >= curDist) {
      const frac = (curDist - accum) / lengths[i];
      pos.x = path[i].x + (path[i+1].x - path[i].x) * frac;
      pos.y = path[i].y + (path[i+1].y - path[i].y) * frac;
      pos.angle = Math.atan2(path[i+1].y - path[i].y, path[i+1].x - path[i].x);
      break;
    }
    accum += lengths[i];
  }

  // Draw Vehicle Pulse
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(pos.angle);

  // Headlight cone
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, 36, 0);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(8, -4);
  ctx.lineTo(40, -16);
  ctx.lineTo(40, 16);
  ctx.lineTo(8, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Vehicle puck
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 18;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.restore();

  // Update scrubber
  const scrubber = document.getElementById('animScrubberFill');
  if (scrubber) scrubber.style.width = `${Math.round((state.animation.progress % 1) * 100)}%`;
}

function startRouteAnimation(routeData) {
  state.animation.active = true;
  state.animation.paused = false;
  state.animation.progress = 0;
  state.animation.lastTime = performance.now();
  document.getElementById('mapAnimControls').classList.remove('hidden');
  document.getElementById('btnToggleAnim').textContent = '⏸';
}

function stopRouteAnimation() {
  state.animation.active = false;
  document.getElementById('mapAnimControls').classList.add('hidden');
}

function startAnimationLoop() {
  function loop(time) {
    if (state.animation.active && !state.animation.paused) {
      const dt = (time - state.animation.lastTime) / 1000;
      state.animation.lastTime = time;
      state.animation.progress += dt * 0.16 * state.animation.speed;
      if (state.animation.progress > 1) state.animation.progress %= 1;
      renderCanvas();
    } else {
      state.animation.lastTime = time;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// ----------------------------------------------------------------------------
//  CANVAS MOUSE & INTERACTION HANDLING (No node dragging)
// ----------------------------------------------------------------------------
function initCanvasInteractions() {
  canvasViewport.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvasViewport.addEventListener('wheel', onWheel, { passive: false });

  // Native Mobile & Tablet Touch Listeners
  canvasViewport.addEventListener('touchstart', onTouchStart, { passive: false });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: false });
  window.addEventListener('touchcancel', onTouchEnd, { passive: false });
}

function screenToWorld(sx, sy) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (sx - rect.left - state.viewport.x) / state.viewport.zoom,
    y: (sy - rect.top - state.viewport.y) / state.viewport.zoom
  };
}

function findNodeAt(wx, wy) {
  const locs = state.network.locations || [];
  let bestNode = null;
  let bestDist = Infinity;
  const maxWorldRadius = 24 / state.viewport.zoom;
  for (let i = locs.length - 1; i >= 0; i--) {
    const d = Math.hypot(locs[i].x - wx, locs[i].y - wy);
    if (d <= maxWorldRadius && d < bestDist) {
      bestDist = d;
      bestNode = locs[i];
    }
  }
  return bestNode;
}

function findRoadAt(wx, wy) {
  const roads = state.network.roads || [];
  const locs = state.network.locations || [];
  let bestRoad = null;
  let bestDist = Infinity;
  const maxWorldDist = 14 / state.viewport.zoom;

  for (const r of roads) {
    const a = locs.find(l => l.name === r.locA);
    const b = locs.find(l => l.name === r.locB);
    if (!a || !b) continue;

    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const badgeHalfW = 46 / state.viewport.zoom;
    const badgeHalfH = 14 / state.viewport.zoom;
    if (Math.abs(wx - midX) <= badgeHalfW && Math.abs(wy - midY) <= badgeHalfH) {
      return r;
    }

    const dist = distToSegment(wx, wy, a.x, a.y, b.x, b.y);
    if (dist <= maxWorldDist && dist < bestDist) {
      bestDist = dist;
      bestRoad = r;
    }
  }
  return bestRoad;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

let pointerDownScreen = null;
let isActuallyPanning = false;

// Touch State
let touchPinchDist = null;
let touchStartPos = null;

function onMouseDown(e) {
  if (e.button !== 0) return;
  pointerDownScreen = { x: e.clientX, y: e.clientY };
  isActuallyPanning = false;

  // Only panning, no node dragging
  state.viewport.isPanning = true;
  state.viewport.panStart = { x: e.clientX - state.viewport.x, y: e.clientY - state.viewport.y };
}

function onMouseMove(e) {
  const pos = screenToWorld(e.clientX, e.clientY);

  if (pointerDownScreen) {
    const dist = Math.hypot(e.clientX - pointerDownScreen.x, e.clientY - pointerDownScreen.y);
    if (dist > 4 && state.viewport.isPanning) {
      isActuallyPanning = true;
    }
  }

  if (state.viewport.isPanning && isActuallyPanning) {
    state.viewport.x = e.clientX - state.viewport.panStart.x;
    state.viewport.y = e.clientY - state.viewport.panStart.y;
    requestRender();
    return;
  }

  // Hover detection for nodes & roads
  const hoveredNode = findNodeAt(pos.x, pos.y);
  const hoveredRoad = hoveredNode ? null : findRoadAt(pos.x, pos.y);

  let needRender = false;
  if (hoveredNode !== state.viewport.hoveredNode) {
    state.viewport.hoveredNode = hoveredNode;
    needRender = true;
  }
  if (hoveredRoad !== state.viewport.hoveredRoad) {
    state.viewport.hoveredRoad = hoveredRoad;
    needRender = true;
  }
  canvasViewport.style.cursor = hoveredNode ? 'pointer' : hoveredRoad ? 'pointer' : 'default';
  if (needRender) requestRender();
}

async function onMouseUp(e) {
  const wasPanning = isActuallyPanning;

  pointerDownScreen = null;
  state.viewport.isPanning = false;
  isActuallyPanning = false;

  if (wasPanning) return;

  const pos = screenToWorld(e.clientX, e.clientY);
  const clickedNode = findNodeAt(pos.x, pos.y);

  if (clickedNode) {
    showNodePopup(clickedNode);
    return;
  }

  // Check if user clicked a road to toggle its open/closed status
  const clickedRoad = findRoadAt(pos.x, pos.y);
  if (clickedRoad) {
    await toggleRoadState(clickedRoad.locA, clickedRoad.locB, !clickedRoad.isActive);
    return;
  }
}

// ----------------------------------------------------------------------------
//  TOUCH GESTURES FOR MOBILE & TABLETS (Pan, Pinch-to-Zoom, Tap — No Dragging)
// ----------------------------------------------------------------------------
function onTouchStart(e) {
  if (e.touches.length === 1) {
    const t = e.touches[0];
    pointerDownScreen = { x: t.clientX, y: t.clientY };
    touchStartPos = { x: t.clientX, y: t.clientY };
    isActuallyPanning = false;

    state.viewport.isPanning = true;
    state.viewport.panStart = { x: t.clientX - state.viewport.x, y: t.clientY - state.viewport.y };
  } else if (e.touches.length === 2) {
    state.viewport.isPanning = false;
    isActuallyPanning = false;
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    touchPinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  }
}

function onTouchMove(e) {
  if (e.touches.length === 1) {
    const t = e.touches[0];

    if (pointerDownScreen) {
      const dist = Math.hypot(t.clientX - pointerDownScreen.x, t.clientY - pointerDownScreen.y);
      if (dist > 8 && state.viewport.isPanning) {
        isActuallyPanning = true;
      }
    }

    if (state.viewport.isPanning && isActuallyPanning) {
      if (e.cancelable) e.preventDefault();
      state.viewport.x = t.clientX - state.viewport.panStart.x;
      state.viewport.y = t.clientY - state.viewport.panStart.y;
      requestRender();
      return;
    }
  } else if (e.touches.length === 2 && touchPinchDist) {
    if (e.cancelable) e.preventDefault();
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const zoomRatio = currentDist / touchPinchDist;
    const newZoom = Math.min(Math.max(state.viewport.zoom * zoomRatio, 0.4), 3.0);

    const midX = (t1.clientX + t2.clientX) / 2;
    const midY = (t1.clientY + t2.clientY) / 2;
    const rect = canvas.getBoundingClientRect();
    const mx = midX - rect.left;
    const my = midY - rect.top;

    state.viewport.x = mx - (mx - state.viewport.x) * (newZoom / state.viewport.zoom);
    state.viewport.y = my - (my - state.viewport.y) * (newZoom / state.viewport.zoom);
    state.viewport.zoom = newZoom;
    touchPinchDist = currentDist;
    requestRender();
  }
}

async function onTouchEnd(e) {
  if (e.touches.length === 0) {
    const wasPanning = isActuallyPanning;
    const startPoint = touchStartPos;

    pointerDownScreen = null;
    touchStartPos = null;
    touchPinchDist = null;
    state.viewport.isPanning = false;
    isActuallyPanning = false;

    if (wasPanning || !startPoint) return;

    // Tap detection on touch release
    const pos = screenToWorld(startPoint.x, startPoint.y);
    const clickedNode = findNodeAt(pos.x, pos.y);
    if (clickedNode) {
      showNodePopup(clickedNode);
      return;
    }

    const clickedRoad = findRoadAt(pos.x, pos.y);
    if (clickedRoad) {
      await toggleRoadState(clickedRoad.locA, clickedRoad.locB, !clickedRoad.isActive);
      return;
    }
  } else if (e.touches.length === 1) {
    touchPinchDist = null;
  }
}

function onWheel(e) {
  e.preventDefault();
  const rect = canvasViewport.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  const newZoom = Math.min(Math.max(state.viewport.zoom * factor, 0.4), 3.0);

  state.viewport.x = mx - (mx - state.viewport.x) * (newZoom / state.viewport.zoom);
  state.viewport.y = my - (my - state.viewport.y) * (newZoom / state.viewport.zoom);
  state.viewport.zoom = newZoom;
  requestRender();
}

function autoFitGraph() {
  const locs = state.network.locations || [];
  if (locs.length === 0) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  locs.forEach(l => {
    minX = Math.min(minX, l.x);
    minY = Math.min(minY, l.y);
    maxX = Math.max(maxX, l.x);
    maxY = Math.max(maxY, l.y);
  });

  const rect = canvasViewport.getBoundingClientRect();
  const pad = 100;
  const gw = maxX - minX || 100;
  const gh = maxY - minY || 100;

  const z = Math.min(Math.max(Math.min((rect.width - pad * 2) / gw, (rect.height - pad * 2) / gh), 0.6), 1.5);
  state.viewport.zoom = z;
  state.viewport.x = (rect.width - gw * z) / 2 - minX * z;
  state.viewport.y = (rect.height - gh * z) / 2 - minY * z;
  requestRender();
}

// ----------------------------------------------------------------------------
//  EVENT LISTENERS & BINDINGS
// ----------------------------------------------------------------------------
function initEventListeners() {
  // Helper banner dismiss
  document.getElementById('btnDismissBanner').addEventListener('click', () => {
    document.getElementById('helperBanner').classList.add('hidden');
  });

  // Toggle Sidebar Button (Desktop & Mobile)
  const appLayout = document.getElementById('appLayout');
  const mobileMapBtn = document.getElementById('btnMobileMap');
  const mobileControlsBtn = document.getElementById('btnMobileControls');

  function setMobileView(view) {
    if (view === 'map') {
      appLayout.classList.add('sidebar-collapsed');
      mobileMapBtn?.classList.add('active');
      mobileControlsBtn?.classList.remove('active');
    } else {
      appLayout.classList.remove('sidebar-collapsed');
      mobileControlsBtn?.classList.add('active');
      mobileMapBtn?.classList.remove('active');
    }
    setTimeout(setupCanvasDimensions, 280);
  }
  window.setMobileView = setMobileView;

  document.getElementById('btnToggleSidebar').addEventListener('click', () => {
    const isNowCollapsed = appLayout.classList.toggle('sidebar-collapsed');
    if (window.innerWidth < 768) {
      if (isNowCollapsed) {
        mobileMapBtn?.classList.add('active');
        mobileControlsBtn?.classList.remove('active');
      } else {
        mobileControlsBtn?.classList.add('active');
        mobileMapBtn?.classList.remove('active');
      }
    }
    setTimeout(setupCanvasDimensions, 280);
  });

  mobileMapBtn?.addEventListener('click', () => setMobileView('map'));
  mobileControlsBtn?.addEventListener('click', () => setMobileView('controls'));
  document.getElementById('btnMobileCloseSidebar')?.addEventListener('click', () => setMobileView('map'));

  // Mobile initial default view: start on map
  if (window.innerWidth < 768) {
    setMobileView('map');
  }

  // Mode toggles
  document.getElementById('btnModeDistance').addEventListener('click', () => switchOptimizationMode('DISTANCE'));
  document.getElementById('btnModeTime').addEventListener('click', () => switchOptimizationMode('TIME'));

  // Swap Start & Destination
  document.getElementById('btnSwapLocations').addEventListener('click', () => {
    const temp = state.selectedSource;
    setStartLocation(state.selectedDestination);
    setEndLocation(temp);
    if (state.selectedSource && state.selectedDestination) calculatePointToPoint();
  });

  // Calculate & Clear Buttons
  document.getElementById('btnCalculateRoute').addEventListener('click', calculatePointToPoint);
  document.getElementById('btnCalculateMultiStop').addEventListener('click', calculateMultiStop);
  document.getElementById('btnCloseResult').addEventListener('click', clearRouteResult);

  // Road Closure Manager listeners
  const btnReopenAll = document.getElementById('btnReopenAllRoads');
  if (btnReopenAll) {
    btnReopenAll.addEventListener('click', reopenAllRoads);
  }

  const btnQuickClose = document.getElementById('btnQuickCloseRoad');
  if (btnQuickClose) {
    btnQuickClose.addEventListener('click', async () => {
      const sel = document.getElementById('selectQuickCloseRoad');
      if (!sel || !sel.value) {
        showToast('Please select a road to close', 'info');
        return;
      }
      const roadId = Number(sel.value);
      const r = (state.network.roads || []).find(x => x.roadId === roadId);
      if (r) {
        await toggleRoadState(r.locA, r.locB, false);
      }
    });
  }

  // Multi-stop helpers
  document.getElementById('btnSelectAllStops').addEventListener('click', () => {
    document.querySelectorAll('input[name="deliveryStop"]').forEach(c => {
      c.checked = true;
      c.closest('.stop-toggle-card').classList.add('checked');
    });
  });
  document.getElementById('btnClearAllStops').addEventListener('click', () => {
    document.querySelectorAll('input[name="deliveryStop"]').forEach(c => {
      c.checked = false;
      c.closest('.stop-toggle-card').classList.remove('checked');
    });
  });

  // Submode switcher
  document.getElementById('btnSubPointToPoint').addEventListener('click', () => {
    document.getElementById('btnSubPointToPoint').classList.add('active');
    document.getElementById('btnSubMultiStop').classList.remove('active');
    document.getElementById('formPointToPoint').classList.remove('hidden');
    document.getElementById('formMultiStop').classList.add('hidden');
    state.activePlannerSubmode = 'pointToPoint';
  });
  document.getElementById('btnSubMultiStop').addEventListener('click', () => {
    document.getElementById('btnSubMultiStop').classList.add('active');
    document.getElementById('btnSubPointToPoint').classList.remove('active');
    document.getElementById('formMultiStop').classList.remove('hidden');
    document.getElementById('formPointToPoint').classList.add('hidden');
    state.activePlannerSubmode = 'multiStop';
  });

  // Node Context Popup buttons
  document.getElementById('btnPopupSetStart').addEventListener('click', () => {
    if (state.viewport.activePopupNode) {
      setStartLocation(state.viewport.activePopupNode.name);
      hideNodePopup();
    }
  });
  document.getElementById('btnPopupSetEnd').addEventListener('click', () => {
    if (state.viewport.activePopupNode) {
      setEndLocation(state.viewport.activePopupNode.name);
      hideNodePopup();
      calculatePointToPoint();
    }
  });
  document.getElementById('btnPopupAddStop').addEventListener('click', () => {
    if (state.viewport.activePopupNode) {
      document.getElementById('btnSubMultiStop').click();
      const chk = document.querySelector(`input[name="deliveryStop"][value="${state.viewport.activePopupNode.name}"]`);
      if (chk) {
        chk.checked = true;
        chk.closest('.stop-toggle-card').classList.add('checked');
        showToast(`Added ${state.viewport.activePopupNode.name} to stops`, 'info');
      }
      hideNodePopup();
    }
  });
  document.getElementById('btnClosePopup').addEventListener('click', hideNodePopup);

  // Map Controls
  document.getElementById('btnZoomIn').addEventListener('click', () => {
    state.viewport.zoom = Math.min(state.viewport.zoom * 1.2, 3.0);
    requestRender();
  });
  document.getElementById('btnZoomOut').addEventListener('click', () => {
    state.viewport.zoom = Math.max(state.viewport.zoom / 1.2, 0.4);
    requestRender();
  });
  document.getElementById('btnCenterNodes').addEventListener('click', autoFitGraph);

  // Animation Controls (play/pause only, no speed)
  document.getElementById('btnToggleAnim').addEventListener('click', () => {
    state.animation.paused = !state.animation.paused;
    document.getElementById('btnToggleAnim').textContent = state.animation.paused ? '▶' : '⏸';
  });

  // Reload City & Docs
  document.getElementById('btnReloadSample').addEventListener('click', async () => {
    if (confirm('Reset to clean sample city data?')) {
      const res = await apiPost('/api/sample-data', {});
      if (res && res.success) {
        showToast('Sample city restored', 'success');
        clearRouteResult();
        await fetchNetwork();
        autoFitGraph();
      }
    }
  });

  // Brand Logo Click: Auto-fit Map
  document.getElementById('btnLogo')?.addEventListener('click', autoFitGraph);

  // ADS Engine Modal
  const oracleModal = document.getElementById('oracleModal');
  document.getElementById('btnDbConfig')?.addEventListener('click', () => {
    oracleModal?.classList.remove('hidden');
    fetchDatabaseInfo();
  });
  document.getElementById('btnCloseOracleModal')?.addEventListener('click', () => {
    oracleModal?.classList.add('hidden');
  });
  document.getElementById('btnDismissOracleModal')?.addEventListener('click', () => {
    oracleModal?.classList.add('hidden');
  });

  // System Architecture & Docs Modal
  document.getElementById('btnOpenDocs')?.addEventListener('click', () => {
    document.getElementById('docsModal')?.classList.remove('hidden');
  });
  document.getElementById('btnCloseDocs')?.addEventListener('click', () => {
    document.getElementById('docsModal')?.classList.add('hidden');
  });
  document.getElementById('btnDismissDocs')?.addEventListener('click', () => {
    document.getElementById('docsModal')?.classList.add('hidden');
  });
}

// ----------------------------------------------------------------------------
//  ADS GRAPH ENGINE STATUS (C++14 / In-Memory ADS)
// ----------------------------------------------------------------------------
async function fetchDatabaseInfo() {
  const info = await apiGet('/api/ads/info') || await apiGet('/api/db/info');
  if (!info) return;

  const topLabel = document.getElementById('dbEngineLabel');
  if (topLabel) {
    topLabel.textContent = 'ADS C++14';
  }

  const topDot = document.getElementById('dbEngineDot');
  if (topDot) {
    topDot.className = 'w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse';
  }

  const badge = document.getElementById('modalDbEngineBadge');
  if (badge) {
    badge.textContent = 'C++14 ADS (ACTIVE)';
    badge.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40';
  }

  const details = document.getElementById('modalDbDetails');
  if (details) {
    details.textContent = info.details || 'In-Memory Graph ADS (Min-Heap Priority Queue & Adjacency List)';
  }
}

async function switchOptimizationMode(mode) {
  if (state.network.criterion === mode) return;
  const res = await apiPost('/api/criterion', { criterion: mode });
  if (res) {
    state.network.criterion = res.criterion;
    state.network.criterionName = res.criterionName;
    document.getElementById('btnModeDistance').classList.toggle('active', mode === 'DISTANCE');
    document.getElementById('btnModeTime').classList.toggle('active', mode === 'TIME');
    showToast(`Optimizing for ${res.criterionName}`, 'info');
    if (state.currentRoute) {
      if (state.activePlannerSubmode === 'pointToPoint') calculatePointToPoint();
      else calculateMultiStop();
    }
  }
}

// ----------------------------------------------------------------------------
//  HELPERS
// ----------------------------------------------------------------------------
function updateHudText(text) {
  const el = document.getElementById('hudStatusText');
  if (el) el.textContent = text;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '⚠️' : 'ℹ️'}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
