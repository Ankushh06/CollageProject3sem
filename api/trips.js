const { state } = require('./_graph');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST') {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
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

  res.status(200).json(state.trips);
};
