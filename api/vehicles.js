const { state } = require('./_graph');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST') {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
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

  res.status(200).json(state.vehicles);
};
