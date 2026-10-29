/**
 * RouteFlow - User-Friendly Delivery Route Optimization System
 * Real-time Dijkstra Algorithm + SQLite Relational Database Engine
 */

const state = {
  network: {
    criterion: 'DISTANCE',
    criterionName: 'Shortest DISTANCE (km)',
    locations: [],
    roads: [],
    closedCount: 0
  },
  selectedSource: null,
  selectedDestination: null,
  selectedDepot: null,
  currentRoute: null,
  activeTab: 'tabPlanner',
  activePlannerSubmode: 'pointToPoint',
  activeReport: 'repTrips',
  drivers: [],
  vehicles: [],
  // Canvas Viewport
  viewport: {
    x: 40,
    y: 30,
    zoom: 1.0,
    isPanning: false,
    panStart: { x: 0, y: 0 },
    draggedNode: null,
    dragOffset: { x: 0, y: 0 },
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
  window.addEventListener('resize', setupCanvasDimensions);

  initEventListeners();
  initCanvasInteractions();

  await fetchNetwork();
  await loadFleetSelectors();
  await refreshActiveReport();
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
  const dpr = window.devicePixelRatio || 1;
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
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } catch (err) {
    console.error('GET error (' + endpoint + '):', err);
    showToast(err.message || 'Network error', 'error');
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');
    return data;
  } catch (err) {
    console.error('POST error (' + endpoint + '):', err);
    showToast(err.message || 'Request failed', 'error');
    return null;
  }
}

async function fetchNetwork() {
  const data = await apiGet('/api/network');
  if (!data) return;

  state.network = data;

  const isDist = data.criterion === 'DISTANCE';
  document.getElementById('btnModeDistance').classList.toggle('active', isDist);
  document.getElementById('btnModeTime').classList.toggle('active', !isDist);

  renderLocationChips();
  populateStopsCheckboxes();
  populateRoadClosureList();
  populateRoadFormDropdowns();
  requestRender();
}

async function loadFleetSelectors() {
  const [drivers, vehicles] = await Promise.all([
    apiGet('/api/drivers'),
    apiGet('/api/vehicles')
  ]);
  if (drivers) {
    state.drivers = drivers;
    populateDriversTable(drivers);
    populateDriverSelect(drivers);
  }
  if (vehicles) {
    state.vehicles = vehicles;
    populateVehiclesTable(vehicles);
    populateVehicleSelect(vehicles);
  }
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

function populateRoadFormDropdowns() {
  const locs = state.network.locations || [];
  const roadFrom = document.getElementById('roadFromSelect');
  const roadTo = document.getElementById('roadToSelect');
  const opts = locs.map(l => `<option value="${escapeHtml(l.name)}">${escapeHtml(l.name)}</option>`).join('');
  roadFrom.innerHTML = opts;
  roadTo.innerHTML = opts;
  if (locs.length > 1) roadTo.selectedIndex = 1;
}

function populateRoadClosureList() {
  const list = document.getElementById('roadClosureList');
  const roads = state.network.roads || [];

  if (roads.length === 0) {
    list.innerHTML = '<div class="subtext">No roads recorded.</div>';
    return;
  }

  list.innerHTML = roads.map(r => {
    const isClosed = !r.isActive;
    return `
      <div class="road-closure-item ${isClosed ? 'is-closed' : ''}">
        <div class="road-closure-info">
          <div class="road-closure-name">${escapeHtml(r.locA)} ⟷ ${escapeHtml(r.locB)}</div>
          <div class="road-closure-stats">${r.distanceKm.toFixed(1)} km • ${r.travelTimeMin.toFixed(0)} min</div>
        </div>
        <button type="button" class="btn-toggle-road ${isClosed ? 'btn-closed' : 'btn-open'}"
                data-from="${escapeHtml(r.locA)}" data-to="${escapeHtml(r.locB)}" data-active="${!isClosed}">
          ${isClosed ? '⛔ Closed (Click to Reopen)' : '✓ Open (Click to Close)'}
        </button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.btn-toggle-road').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const from = btn.getAttribute('data-from');
      const to = btn.getAttribute('data-to');
      const active = btn.getAttribute('data-active') === 'true';
      await toggleRoadState(from, to, !active);
    });
  });
}

async function toggleRoadState(from, to, newActiveState) {
  const res = await apiPost('/api/roads/toggle', { from, to, active: newActiveState });
  if (res && res.success) {
    const statusText = newActiveState ? 'REOPENED' : 'CLOSED';
    showToast(`Road ${from} ⟷ ${to} is now ${statusText}!`, newActiveState ? 'success' : 'error');
    updateHudText(`Road ${from} ⟷ ${to} ${statusText}. Recalculating path...`);
    await fetchNetwork();
    if (state.currentRoute) {
      if (state.activePlannerSubmode === 'pointToPoint') calculatePointToPoint();
      else calculateMultiStop();
    }
  }
}

function populateDriversTable(drivers) {
  const tbody = document.getElementById('driverRosterBody');
  tbody.innerHTML = (!drivers || drivers.length === 0) ?
    '<tr><td colspan="3" class="subtext">No drivers registered</td></tr>' :
    drivers.map(d => `<tr><td><code>#${d.id}</code></td><td><strong>${escapeHtml(d.name)}</strong></td><td>${escapeHtml(d.phone)}</td></tr>`).join('');
}

function populateVehiclesTable(vehicles) {
  const tbody = document.getElementById('vehicleRosterBody');
  tbody.innerHTML = (!vehicles || vehicles.length === 0) ?
    '<tr><td colspan="4" class="subtext">No vehicles registered</td></tr>' :
    vehicles.map(v => `<tr><td><code>#${v.id}</code></td><td><strong>${escapeHtml(v.regNo)}</strong></td><td><span class="label-badge start-badge">${escapeHtml(v.type)}</span></td><td>${v.capacityKg} kg</td></tr>`).join('');
}

function populateDriverSelect(drivers) {
  const sel = document.getElementById('selectTripDriver');
  sel.innerHTML = '<option value="">0 - Unassigned</option>' +
    drivers.map(d => `<option value="${d.id}">#${d.id} - ${escapeHtml(d.name)}</option>`).join('');
}

function populateVehicleSelect(vehicles) {
  const sel = document.getElementById('selectTripVehicle');
  sel.innerHTML = '<option value="">0 - Unassigned</option>' +
    vehicles.map(v => `<option value="${v.id}">#${v.id} - ${escapeHtml(v.regNo)} (${v.type})</option>`).join('');
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
  const res = await apiPost('/api/route', {
    source,
    destination,
    criterion: state.network.criterion
  });

  if (res && res.valid) {
    displayRouteResult(res);
    startRouteAnimation(res);
    updateHudText(`Optimal Route: ${res.km.toFixed(1)} km in ${res.minutes.toFixed(0)} min`);
    showToast(`Optimal route found: ${res.km.toFixed(1)} km in ${res.minutes.toFixed(0)} min`, 'success');
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
  const res = await apiPost('/api/plan', {
    depot,
    stops,
    returnToDepot,
    criterion: state.network.criterion
  });

  if (res && res.valid) {
    displayRouteResult(res);
    startRouteAnimation(res);
    updateHudText(`Multi-stop tour: ${res.order.length} stops, ${res.km.toFixed(1)} km`);
    showToast(`Multi-stop route optimized: ${res.order.length} stops, ${res.km.toFixed(1)} km`, 'success');
  } else {
    showToast('Could not calculate multi-stop route. Check road closures.', 'error');
    clearRouteResult();
  }
}

function displayRouteResult(routeData) {
  state.currentRoute = routeData;
  const card = document.getElementById('routeResultCard');
  card.classList.remove('hidden');

  document.getElementById('resultModeBadge').textContent = state.network.criterion;
  document.getElementById('resTotalKm').textContent = routeData.km.toFixed(1);
  document.getElementById('resTotalMin').textContent = routeData.minutes.toFixed(0) + 'm';
  document.getElementById('resLegsCount').textContent = routeData.legs ? routeData.legs.length : (routeData.fullRoute.length - 1);

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

  document.getElementById('saveTripFeedback').classList.add('hidden');
  requestRender();
}

function clearRouteResult() {
  state.currentRoute = null;
  document.getElementById('routeResultCard').classList.add('hidden');
  stopRouteAnimation();
  updateHudText('Route cleared. Click any node to plan a new route.');
  requestRender();
}

async function saveTripToDatabase() {
  if (!state.currentRoute || !state.currentRoute.valid) return;
  const driverId = parseInt(document.getElementById('selectTripDriver').value) || null;
  const vehicleId = parseInt(document.getElementById('selectTripVehicle').value) || null;
  const stops = state.currentRoute.order || [state.currentRoute.destination];

  const payload = {
    depot: state.currentRoute.depot,
    stops: stops,
    criterion: state.network.criterion,
    km: state.currentRoute.km,
    minutes: state.currentRoute.minutes,
    routeText: state.currentRoute.routeText,
    driverId: driverId,
    vehicleId: vehicleId
  };

  const res = await apiPost('/api/trips', payload);
  const feedback = document.getElementById('saveTripFeedback');
  if (res && res.success) {
    feedback.className = 'save-feedback success';
    feedback.innerHTML = `✓ Trip #<strong>${res.tripId}</strong> committed to SQLite (view in Trip Logs)!`;
    feedback.classList.remove('hidden');
    showToast(`Trip #${res.tripId} saved to database`, 'success');
  } else {
    feedback.className = 'save-feedback error';
    feedback.textContent = 'Could not save trip.';
    feedback.classList.remove('hidden');
  }
}

// ----------------------------------------------------------------------------
//  1-CLICK DEMO SCENARIOS
// ----------------------------------------------------------------------------
function runDemoPointToPoint() {
  // Switch to Point-to-Point tab
  document.getElementById('btnSubPointToPoint').click();
  setStartLocation('Warehouse');
  setEndLocation('Airport');
  calculatePointToPoint();
  autoFitGraph();
}

function runDemoMultiStop() {
  document.getElementById('btnSubMultiStop').click();
  setDepotLocation('Warehouse');
  // Check 4 stops
  const targets = ['Market', 'Hospital', 'Mall', 'Tech Park'];
  document.querySelectorAll('input[name="deliveryStop"]').forEach(c => {
    c.checked = targets.includes(c.value);
    c.closest('.stop-toggle-card').classList.toggle('checked', c.checked);
  });
  calculateMultiStop();
  autoFitGraph();
}

async function runDemoClosure() {
  document.getElementById('btnSubPointToPoint').click();
  setStartLocation('Warehouse');
  setEndLocation('Airport');
  // Close the road Warehouse <-> Market
  await toggleRoadState('Warehouse', 'Market', false);
  calculatePointToPoint();
  showToast('Road closed! Notice Dijkstra took the Hospital detour.', 'info');
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

  popup.style.left = `${Math.min(Math.max(screenX - 130, 10), canvasViewport.clientWidth - 280)}px`;
  popup.style.top = `${Math.max(screenY - 180, 10)}px`;
  popup.classList.remove('hidden');
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
  // Reset transform to identity and clear the entire backing store
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Scale by DPR so 1 canvas unit = 1 CSS pixel
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Pan and zoom in CSS pixel space
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
    const isClosed = !r.isActive;
    const isHovered = (state.viewport.hoveredRoad === r);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);

    if (inRoute) {
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
    } else if (isClosed) {
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = isHovered ? 3.5 : 2;
      ctx.setLineDash([6, 6]);
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
//  CANVAS MOUSE & INTERACTION HANDLING
// ----------------------------------------------------------------------------
function initCanvasInteractions() {
  canvasViewport.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvasViewport.addEventListener('wheel', onWheel, { passive: false });
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
  // Screen pixel tolerance converted to world units
  const maxWorldDist = 12 / state.viewport.zoom;

  for (const r of roads) {
    const a = locs.find(l => l.name === r.locA);
    const b = locs.find(l => l.name === r.locB);
    if (!a || !b) continue;

    // Check if clicking directly on the road's middle info badge
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const badgeHalfW = 46 / state.viewport.zoom;
    const badgeHalfH = 14 / state.viewport.zoom;
    if (Math.abs(wx - midX) <= badgeHalfW && Math.abs(wy - midY) <= badgeHalfH) {
      return r;
    }

    // Point-to-segment distance to road line
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
let isActuallyDraggingNode = false;
let isActuallyPanning = false;

function onMouseDown(e) {
  if (e.button !== 0) return;
  pointerDownScreen = { x: e.clientX, y: e.clientY };
  isActuallyDraggingNode = false;
  isActuallyPanning = false;

  const pos = screenToWorld(e.clientX, e.clientY);
  const clickedNode = findNodeAt(pos.x, pos.y);

  if (clickedNode) {
    state.viewport.draggedNode = clickedNode;
    state.viewport.dragOffset = { x: clickedNode.x - pos.x, y: clickedNode.y - pos.y };
  } else {
    state.viewport.isPanning = true;
    state.viewport.panStart = { x: e.clientX - state.viewport.x, y: e.clientY - state.viewport.y };
  }
}

function onMouseMove(e) {
  const pos = screenToWorld(e.clientX, e.clientY);

  if (pointerDownScreen) {
    const dist = Math.hypot(e.clientX - pointerDownScreen.x, e.clientY - pointerDownScreen.y);
    if (dist > 4) {
      if (state.viewport.draggedNode) {
        isActuallyDraggingNode = true;
      } else if (state.viewport.isPanning) {
        isActuallyPanning = true;
      }
    }
  }

  if (state.viewport.draggedNode && isActuallyDraggingNode) {
    state.viewport.draggedNode.x = Math.round(pos.x + state.viewport.dragOffset.x);
    state.viewport.draggedNode.y = Math.round(pos.y + state.viewport.dragOffset.y);
    requestRender();
    return;
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
  canvasViewport.style.cursor = hoveredNode ? 'pointer' : hoveredRoad ? 'pointer' : 'grab';
  if (needRender) requestRender();
}

async function onMouseUp(e) {
  const wasDragging = isActuallyDraggingNode;
  const wasPanning = isActuallyPanning;
  const dragged = state.viewport.draggedNode;

  pointerDownScreen = null;
  state.viewport.draggedNode = null;
  state.viewport.isPanning = false;
  isActuallyDraggingNode = false;
  isActuallyPanning = false;

  if (dragged && wasDragging) {
    await apiPost('/api/locations/coords', { id: dragged.id, x: dragged.x, y: dragged.y });
    return;
  }

  if (wasPanning) return;

  const pos = screenToWorld(e.clientX, e.clientY);
  const clickedNode = findNodeAt(pos.x, pos.y);

  if (clickedNode) {
    showNodePopup(clickedNode);
    return;
  }

  // Check if user clicked a road to toggle its open/closed status!
  const clickedRoad = findRoadAt(pos.x, pos.y);
  if (clickedRoad) {
    await toggleRoadState(clickedRoad.locA, clickedRoad.locB, !clickedRoad.isActive);
    return;
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
  // 1-Click Demos
  document.getElementById('demoPointToPoint').addEventListener('click', runDemoPointToPoint);
  document.getElementById('demoMultiStop').addEventListener('click', runDemoMultiStop);
  document.getElementById('demoClosure').addEventListener('click', runDemoClosure);
  document.getElementById('demoReset').addEventListener('click', clearRouteResult);

  // Helper banner dismiss
  document.getElementById('btnDismissBanner').addEventListener('click', () => {
    document.getElementById('helperBanner').classList.add('hidden');
  });

  // Toggle Sidebar Button
  document.getElementById('btnToggleSidebar').addEventListener('click', () => {
    document.getElementById('appLayout').classList.toggle('sidebar-collapsed');
    setTimeout(setupCanvasDimensions, 280);
  });

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
  document.getElementById('btnSaveTrip').addEventListener('click', saveTripToDatabase);

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

  // Tabs switcher
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
      });
      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');
      const targetPane = document.getElementById(target);
      if (targetPane) {
        targetPane.classList.add('active');
        targetPane.style.display = 'block';
      }
      state.activeTab = target;
      if (target === 'tabAnalytics') refreshActiveReport();
    });
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

  // Forms: Add Location & Road
  document.getElementById('btnAddLocation').addEventListener('click', async () => {
    const name = document.getElementById('locNameInput').value.trim();
    const type = document.getElementById('locTypeSelect').value;
    if (!name) return showToast('Enter a location name', 'info');
    const res = await apiPost('/api/locations', { name, type });
    if (res && res.success) {
      showToast(`Added '${name}' (${type})`, 'success');
      document.getElementById('locNameInput').value = '';
      await fetchNetwork();
    }
  });

  document.getElementById('btnAddRoad').addEventListener('click', async () => {
    const from = document.getElementById('roadFromSelect').value;
    const to = document.getElementById('roadToSelect').value;
    const distance = parseFloat(document.getElementById('roadDistanceInput').value);
    const time = parseFloat(document.getElementById('roadTimeInput').value);
    if (!from || !to || isNaN(distance) || isNaN(time) || distance <= 0 || time <= 0) {
      return showToast('Provide valid distance and time', 'info');
    }
    if (from.toLowerCase() === to.toLowerCase()) {
      return showToast('Road must connect two different locations', 'info');
    }
    const res = await apiPost('/api/roads', { from, to, distance, time });
    if (res && res.success) {
      showToast(`Saved road: ${from} ⟷ ${to}`, 'success');
      document.getElementById('roadDistanceInput').value = '';
      document.getElementById('roadTimeInput').value = '';
      await fetchNetwork();
    }
  });

  // Fleet forms
  document.getElementById('btnAddDriver').addEventListener('click', async () => {
    const name = document.getElementById('driverNameInput').value.trim();
    const phone = document.getElementById('driverPhoneInput').value.trim();
    if (!name || phone.length < 7) return showToast('Valid name & phone required', 'info');
    const res = await apiPost('/api/drivers', { name, phone });
    if (res && res.success) {
      showToast(`Driver '${name}' added`, 'success');
      document.getElementById('driverNameInput').value = '';
      document.getElementById('driverPhoneInput').value = '';
      await loadFleetSelectors();
    }
  });

  document.getElementById('btnAddVehicle').addEventListener('click', async () => {
    const regNo = document.getElementById('vehicleRegInput').value.trim();
    const type = document.getElementById('vehicleTypeSelect').value;
    const capacity = parseFloat(document.getElementById('vehicleCapInput').value);
    if (!regNo || isNaN(capacity) || capacity <= 0) return showToast('Valid plate & capacity required', 'info');
    const res = await apiPost('/api/vehicles', { regNo, type, capacity });
    if (res && res.success) {
      showToast(`Vehicle '${regNo}' added`, 'success');
      document.getElementById('vehicleRegInput').value = '';
      document.getElementById('vehicleCapInput').value = '';
      await loadFleetSelectors();
    }
  });

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

  // Animation Controls
  document.getElementById('btnToggleAnim').addEventListener('click', () => {
    state.animation.paused = !state.animation.paused;
    document.getElementById('btnToggleAnim').textContent = state.animation.paused ? '▶' : '⏸';
  });
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.animation.speed = parseFloat(btn.getAttribute('data-speed'));
    });
  });

  // Reports
  document.querySelectorAll('.report-tab').forEach(rt => {
    rt.addEventListener('click', () => {
      document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.report-panel').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
      });
      rt.classList.add('active');
      const target = rt.getAttribute('data-report');
      const targetPanel = document.getElementById(target);
      if (targetPanel) {
        targetPanel.classList.add('active');
        targetPanel.style.display = 'block';
      }
      state.activeReport = target;
      refreshActiveReport();
    });
  });

  document.getElementById('btnRefreshTrips').addEventListener('click', refreshActiveReport);
  document.getElementById('btnRefreshDrivers').addEventListener('click', refreshActiveReport);
  document.getElementById('btnRefreshLocations').addEventListener('click', refreshActiveReport);
  document.getElementById('btnRefreshAudit').addEventListener('click', refreshActiveReport);

  // Reload City & Docs
  document.getElementById('btnReloadSample').addEventListener('click', async () => {
    if (confirm('Reset to clean sample city data?')) {
      const res = await apiPost('/api/sample-data', {});
      if (res && res.success) {
        showToast('Sample city restored', 'success');
        clearRouteResult();
        await fetchNetwork();
        await loadFleetSelectors();
        autoFitGraph();
      }
    }
  });

  // Brand Logo Click: Auto-fit Map
  document.getElementById('btnLogo')?.addEventListener('click', autoFitGraph);

  // Oracle Database Modal
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
//  DATABASE ENGINE STATUS (Oracle / SQLite)
// ----------------------------------------------------------------------------
async function fetchDatabaseInfo() {
  const info = await apiGet('/api/db/info');
  if (!info) return;

  const engine = (info.engine || 'SQLITE').toUpperCase();
  const isOracle = engine === 'ORACLE';

  const topLabel = document.getElementById('dbEngineLabel');
  if (topLabel) {
    topLabel.textContent = isOracle ? 'Oracle DB' : 'SQLite DB';
  }

  const topDot = document.getElementById('dbEngineDot');
  if (topDot) {
    topDot.className = isOracle
      ? 'w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e] animate-pulse'
      : 'w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse';
  }

  const badge = document.getElementById('modalDbEngineBadge');
  if (badge) {
    if (isOracle) {
      badge.textContent = 'ORACLE (ACTIVE)';
      badge.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40';
    } else {
      badge.textContent = 'SQLITE (ACTIVE)';
      badge.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
    }
  }

  const details = document.getElementById('modalDbDetails');
  if (details) {
    details.textContent = info.details || (isOracle ? 'Oracle Database (ojdbc11)' : 'SQLite (delivery.db)');
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
//  REPORTS LOADER
// ----------------------------------------------------------------------------
async function refreshActiveReport() {
  switch (state.activeReport) {
    case 'repTrips': {
      const data = await apiGet('/api/trips');
      const tbody = document.getElementById('tripHistoryBody');
      tbody.innerHTML = (!data || data.length === 0) ?
        '<tr><td colspan="9" class="subtext">No saved trips yet.</td></tr>' :
        data.map(t => `
          <tr>
            <td><code>#${t.id}</code></td>
            <td>${t.createdAt.substring(0, 16)}</td>
            <td>${escapeHtml(t.depot)}</td>
            <td><strong>${escapeHtml(t.driver)}</strong></td>
            <td>${escapeHtml(t.vehicle)}</td>
            <td><span class="label-badge ${t.criterion === 'DISTANCE' ? 'start-badge' : 'end-badge'}">${t.criterion}</span></td>
            <td>${t.stops}</td>
            <td>${t.km.toFixed(1)}</td>
            <td>${t.min.toFixed(0)}m</td>
          </tr>
        `).join('');
      break;
    }
    case 'repDrivers': {
      const data = await apiGet('/api/reports/drivers');
      const tbody = document.getElementById('driverPerfBody');
      tbody.innerHTML = (!data || data.length === 0) ?
        '<tr><td colspan="4" class="subtext">No driver data</td></tr>' :
        data.map(d => `
          <tr>
            <td><strong>${escapeHtml(d.driver)}</strong></td>
            <td>${d.trips}</td>
            <td>${d.totalKm.toFixed(1)} km</td>
            <td>${d.avgMinutes.toFixed(0)} min</td>
          </tr>
        `).join('');
      break;
    }
    case 'repLocations': {
      const data = await apiGet('/api/reports/top-locations');
      const tbody = document.getElementById('topLocationsBody');
      tbody.innerHTML = (!data || data.length === 0) ?
        '<tr><td colspan="3" class="subtext">No data</td></tr>' :
        data.map(l => `
          <tr>
            <td><strong>${escapeHtml(l.location)}</strong></td>
            <td><span class="label-badge ${l.type === 'WAREHOUSE' ? 'start-badge' : 'end-badge'}">${l.type}</span></td>
            <td>${l.deliveries} deliveries</td>
          </tr>
        `).join('');
      break;
    }
    case 'repAudit': {
      const data = await apiGet('/api/reports/audit');
      const tbody = document.getElementById('auditTrailBody');
      tbody.innerHTML = (!data || data.length === 0) ?
        '<tr><td colspan="5" class="subtext">No audit changes</td></tr>' :
        data.map(a => `
          <tr>
            <td><code>#${a.id}</code></td>
            <td>${a.changedAt.substring(0, 19)}</td>
            <td>Road #${a.roadId}</td>
            <td><span class="label-badge ${a.action === 'CLOSED' ? 'end-badge' : 'start-badge'}">${escapeHtml(a.action)}</span></td>
            <td>${escapeHtml(a.details || '-')}</td>
          </tr>
        `).join('');
      break;
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
