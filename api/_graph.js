/**
 * RouteFlow - Vercel Serverless Graph DSA & Store
 */

const DEFAULT_LOCATIONS = [
  { id: 0, name: 'Warehouse', type: 'WAREHOUSE', x: 160, y: 240 },
  { id: 1, name: 'Market', type: 'CUSTOMER', x: 340, y: 200 },
  { id: 2, name: 'Hospital', type: 'CUSTOMER', x: 310, y: 80 },
  { id: 3, name: 'University', type: 'CUSTOMER', x: 490, y: 80 },
  { id: 4, name: 'Railway Station', type: 'LANDMARK', x: 320, y: 390 },
  { id: 5, name: 'Mall', type: 'CUSTOMER', x: 570, y: 210 },
  { id: 6, name: 'Airport', type: 'LANDMARK', x: 760, y: 130 },
  { id: 7, name: 'Bus Stand', type: 'LANDMARK', x: 150, y: 380 },
  { id: 8, name: 'Old City', type: 'CUSTOMER', x: 230, y: 460 },
  { id: 9, name: 'Tech Park', type: 'CUSTOMER', x: 680, y: 260 }
];

const DEFAULT_ROADS = [
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
  { roadId: 16, locA: 'Bus Stand', locB: 'Old City', distanceKm: 5.0, travelTimeMin: 15.0, isActive: true }
];

const DEFAULT_DRIVERS = [
  { id: 1, name: 'Ravi Kumar', phone: '9876500001' },
  { id: 2, name: 'Amit Singh', phone: '9876500002' },
  { id: 3, name: 'Neha Sharma', phone: '9876500003' }
];

const DEFAULT_VEHICLES = [
  { id: 1, regNo: 'PB-01-AA-1001', type: 'VAN', capacityKg: 800 },
  { id: 2, regNo: 'PB-01-AA-1002', type: 'BIKE', capacityKg: 40 },
  { id: 3, regNo: 'PB-01-AA-1003', type: 'TRUCK', capacityKg: 3000 }
];

let state = {
  criterion: 'DISTANCE',
  locations: JSON.parse(JSON.stringify(DEFAULT_LOCATIONS)),
  roads: JSON.parse(JSON.stringify(DEFAULT_ROADS)),
  drivers: JSON.parse(JSON.stringify(DEFAULT_DRIVERS)),
  vehicles: JSON.parse(JSON.stringify(DEFAULT_VEHICLES)),
  trips: [],
  audit: []
};

function resetSample() {
  state.criterion = 'DISTANCE';
  state.locations = JSON.parse(JSON.stringify(DEFAULT_LOCATIONS));
  state.roads = JSON.parse(JSON.stringify(DEFAULT_ROADS));
  state.drivers = JSON.parse(JSON.stringify(DEFAULT_DRIVERS));
  state.vehicles = JSON.parse(JSON.stringify(DEFAULT_VEHICLES));
  state.trips = [];
  state.audit = [];
}

// Dijkstra Algorithm
function dijkstra(srcName, dstName, criterion = 'DISTANCE') {
  const isTime = (criterion === 'TIME');
  const locMap = new Map();
  state.locations.forEach(l => locMap.set(l.name.toLowerCase(), l));

  const srcLoc = locMap.get(srcName.trim().toLowerCase());
  const dstLoc = locMap.get(dstName.trim().toLowerCase());
  if (!srcLoc || !dstLoc) return { valid: false };

  // Build adjacency list for open roads
  const adj = new Map();
  state.locations.forEach(l => adj.set(l.name, []));

  state.roads.forEach(r => {
    if (!r.isActive) return;
    const w = isTime ? r.travelTimeMin : r.distanceKm;
    if (adj.has(r.locA)) adj.get(r.locA).push({ to: r.locB, cost: w, km: r.distanceKm, min: r.travelTimeMin });
    if (adj.has(r.locB)) adj.get(r.locB).push({ to: r.locA, cost: w, km: r.distanceKm, min: r.travelTimeMin });
  });

  const dist = {};
  const parent = {};
  const legInfo = {};
  state.locations.forEach(l => {
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

  // Reconstruct path
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

// TSP Multi-stop tour planner
function planTSP(depotName, stops, returnToDepot = true, criterion = 'DISTANCE') {
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
      const sub = dijkstra(current, unvisited[i], criterion);
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
    const returnPlan = dijkstra(current, depotName, criterion);
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
  state.locations.forEach(l => locMap.set(l.name.toLowerCase(), l.id));
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

module.exports = {
  state,
  resetSample,
  dijkstra,
  planTSP
};
