const { state } = require('./_graph');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST') {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
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

  res.status(200).json(state.locations);
};
