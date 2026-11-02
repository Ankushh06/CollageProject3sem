/**
 * RouteFlow - Consolidated Vercel Serverless Function (Hobby Plan Compliant: 1 Function)
 * Handles all /api/* routes via internal routing.
 */

const { state, dijkstra, planTSP, resetSample } = require('./_graph');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract route path: e.g. 'network', 'route', 'roads/toggle', 'db/info'
  let endpoint = (req.query && req.query.path) ? req.query.path : '';
  if (!endpoint) {
    const match = (req.url || '').match(/[?&]path=([^&]+)/);
    if (match) endpoint = decodeURIComponent(match[1]);
  }
  if (!endpoint) {
    endpoint = (req.url || '').split('?')[0].replace(/^\/api\/?/, '');
  }
  endpoint = endpoint.replace(/\/+$/, '').toLowerCase();

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};

  // 1. /api/network
  if (endpoint === 'network' || endpoint === '') {
    const closedCount = state.roads.filter(r => !r.isActive).length;
    return res.status(200).json({
      criterion: state.criterion,
      criterionName: state.criterion === 'TIME' ? 'Fastest TIME (min)' : 'Shortest DISTANCE (km)',
      locations: state.locations,
      roads: state.roads,
      closedCount,
      dbEngine: 'ADS SERVERLESS ENGINE',
      dbDetails: 'Vercel Serverless Graph ADS Engine (Adjacency List + Min-Heap)'
    });
  }

  // 2. /api/criterion
  if (endpoint === 'criterion') {
    if (req.method === 'POST') {
      state.criterion = (body.criterion === 'TIME') ? 'TIME' : 'DISTANCE';
    }
    return res.status(200).json({
      criterion: state.criterion,
      criterionName: state.criterion === 'TIME' ? 'Fastest TIME (min)' : 'Shortest DISTANCE (km)'
    });
  }

  // 3. /api/route
  if (endpoint === 'route') {
    const { source, destination, criterion } = body;
    if (!source || !destination) {
      return res.status(400).json({ error: 'Source and destination required' });
    }
    const crit = criterion || state.criterion || 'DISTANCE';
    const plan = dijkstra(source, destination, crit);
    if (!plan.valid) {
      return res.status(400).json({ error: 'No open road route found', plan });
    }
    return res.status(200).json(plan);
  }

  // 4. /api/plan
  if (endpoint === 'plan') {
    const { depot = 'Warehouse', stops = [], returnToDepot = true, criterion } = body;
    const crit = criterion || state.criterion || 'DISTANCE';
    const plan = planTSP(depot, stops, returnToDepot, crit);
    if (!plan.valid) {
      return res.status(400).json({ error: plan.error || 'Could not plan multi-stop delivery route', plan });
    }
    return res.status(200).json(plan);
  }

  // 5. /api/locations
  if (endpoint === 'locations') {
    if (req.method === 'POST') {
      const { name, type = 'CUSTOMER' } = body;
      if (!name) return res.status(400).json({ error: 'Name is required' });
      const existing = state.locations.find(l => l.name.toLowerCase() === name.trim().toLowerCase());
      if (existing) return res.status(400).json({ error: 'Location already exists' });

      const newLoc = {
        id: state.locations.length,
        name: name.trim(),
        type: type.toUpperCase(),
        x: 300 + Math.random() * 200,
        y: 200 + Math.random() * 200
      };
      state.locations.push(newLoc);
      return res.status(200).json({ success: true, location: newLoc });
    }
    return res.status(200).json(state.locations);
  }

  // 6. /api/locations/coords
  if (endpoint === 'locations/coords') {
    if (req.method === 'POST') {
      const { id, x, y } = body;
      const loc = state.locations.find(l => l.id === id);
      if (loc) {
        loc.x = Number(x);
        loc.y = Number(y);
        return res.status(200).json({ success: true });
      }
      return res.status(404).json({ error: 'Location not found' });
    }
    return res.status(200).json({ success: true });
  }

  // 7. /api/roads
  if (endpoint === 'roads') {
    if (req.method === 'POST') {
      const { from, to, distance, time } = body;
      if (!from || !to || !distance || !time || from.toLowerCase() === to.toLowerCase()) {
        return res.status(400).json({ error: 'Valid road parameters required' });
      }

      let existing = state.roads.find(r =>
        (r.locA.toLowerCase() === from.toLowerCase() && r.locB.toLowerCase() === to.toLowerCase()) ||
        (r.locB.toLowerCase() === from.toLowerCase() && r.locA.toLowerCase() === to.toLowerCase())
      );

      if (existing) {
        existing.distanceKm = Number(distance);
        existing.travelTimeMin = Number(time);
        existing.isActive = true;
      } else {
        existing = {
          roadId: state.roads.length + 1,
          locA: from,
          locB: to,
          distanceKm: Number(distance),
          travelTimeMin: Number(time),
          isActive: true
        };
        state.roads.push(existing);
      }

      state.audit.unshift({
        id: state.audit.length + 1,
        changedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        roadId: existing.roadId,
        action: existing ? 'UPDATED' : 'ADDED',
        details: `${from} ⟷ ${to} (${distance} km, ${time} min)`
      });

      return res.status(200).json({ success: true });
    }
    return res.status(200).json(state.roads);
  }

  // 8. /api/roads/toggle
  if (endpoint === 'roads/toggle') {
    const { from, to, active } = body;
    const road = state.roads.find(r => 
      (r.locA.toLowerCase() === from?.toLowerCase() && r.locB.toLowerCase() === to?.toLowerCase()) ||
      (r.locB.toLowerCase() === from?.toLowerCase() && r.locA.toLowerCase() === to?.toLowerCase())
    );

    if (!road) {
      return res.status(404).json({ error: 'Road not found' });
    }

    road.isActive = Boolean(active);
    state.audit.unshift({
      id: state.audit.length + 1,
      changedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      roadId: road.roadId,
      action: road.isActive ? 'REOPENED' : 'CLOSED',
      details: `${road.locA} ⟷ ${road.locB}`
    });

    return res.status(200).json({ success: true, active: road.isActive });
  }

  // 9. /api/trips
  if (endpoint === 'trips') {
    if (req.method === 'POST') {
      const { depot, driver, vehicle, criterion = 'DISTANCE', km, minutes, fullRoute = [], routeText = '' } = body;
      const newTrip = {
        id: state.trips.length + 1,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        depot: depot || 'Warehouse',
        driver: driver || 'Ravi Kumar',
        vehicle: vehicle || 'PB-01-AA-1001',
        criterion,
        stops: fullRoute.length,
        km: Number(km) || 0,
        min: Number(minutes) || 0,
        routeText
      };
      state.trips.unshift(newTrip);
      return res.status(200).json({ success: true, tripId: newTrip.id });
    }
    return res.status(200).json(state.trips);
  }

  // 10. /api/drivers
  if (endpoint === 'drivers') {
    if (req.method === 'POST') {
      const { name, phone } = body;
      if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });
      const newDriver = {
        id: state.drivers.length + 1,
        name: name.trim(),
        phone: phone.trim()
      };
      state.drivers.push(newDriver);
      return res.status(200).json({ success: true, driver: newDriver });
    }
    return res.status(200).json(state.drivers);
  }

  // 11. /api/vehicles
  if (endpoint === 'vehicles') {
    if (req.method === 'POST') {
      const { regNo, type = 'VAN', capacity = 500 } = body;
      if (!regNo) return res.status(400).json({ error: 'Registration number required' });
      const newVehicle = {
        id: state.vehicles.length + 1,
        regNo: regNo.trim().toUpperCase(),
        type: type.toUpperCase(),
        capacityKg: Number(capacity)
      };
      state.vehicles.push(newVehicle);
      return res.status(200).json({ success: true, vehicle: newVehicle });
    }
    return res.status(200).json(state.vehicles);
  }

  // 12. /api/reports/drivers
  if (endpoint === 'reports/drivers') {
    const report = state.drivers.map(d => {
      const driverTrips = state.trips.filter(t => t.driver === d.name);
      const totalKm = driverTrips.reduce((acc, t) => acc + (t.km || 0), 0);
      const totalMin = driverTrips.reduce((acc, t) => acc + (t.min || 0), 0);
      const avgMinutes = driverTrips.length > 0 ? (totalMin / driverTrips.length) : 0;
      return {
        driver: d.name,
        trips: driverTrips.length,
        totalKm,
        avgMinutes
      };
    });
    return res.status(200).json(report);
  }

  // 13. /api/reports/top-locations
  if (endpoint === 'reports/top-locations') {
    const counts = {};
    state.trips.forEach(t => {
      (t.routeText || '').split('->').forEach(seg => {
        const name = seg.trim();
        if (name) counts[name] = (counts[name] || 0) + 1;
      });
    });

    const report = state.locations.map(l => ({
      location: l.name,
      type: l.type,
      deliveries: counts[l.name] || 0
    })).sort((a, b) => b.deliveries - a.deliveries);

    return res.status(200).json(report);
  }

  // 14. /api/reports/audit
  if (endpoint === 'reports/audit') {
    return res.status(200).json(state.audit);
  }

  // 15. /api/sample-data
  if (endpoint === 'sample-data') {
    resetSample();
    return res.status(200).json({ success: true, message: 'Sample city reloaded successfully' });
  }

  // 16. /api/db/info
  if (endpoint === 'db/info') {
    const isOracleEnv = Boolean(process.env.ORACLE_HOST || process.env.ORACLE_SERVICE);
    return res.status(200).json({
      engine: isOracleEnv ? 'ORACLE' : 'ORACLE / VERCEL',
      details: isOracleEnv ? `Oracle Cloud Database (${process.env.ORACLE_SERVICE || 'FREEPDB1'})` : 'Vercel Serverless DBMS Engine (Active)',
      isOracle: isOracleEnv,
      host: process.env.ORACLE_HOST || 'localhost',
      port: process.env.ORACLE_PORT || '1521',
      service: process.env.ORACLE_SERVICE || 'FREEPDB1',
      user: process.env.ORACLE_USER || 'SYSTEM'
    });
  }

  return res.status(404).json({ error: 'API endpoint not found', endpoint });
};
