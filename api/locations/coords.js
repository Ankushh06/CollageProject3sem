const { state } = require('../_graph');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST') {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
    const { id, x, y } = body;
    const loc = state.locations.find(l => l.id === id);
    if (loc) {
      loc.x = Number(x);
      loc.y = Number(y);
      return res.status(200).json({ success: true });
    }
    return res.status(404).json({ error: 'Location not found' });
  }

  res.status(200).json({ success: true });
};
