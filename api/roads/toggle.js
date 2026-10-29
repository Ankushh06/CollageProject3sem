const { state } = require('../_graph');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
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

  res.status(200).json({ success: true, active: road.isActive });
};
