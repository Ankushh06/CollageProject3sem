const { state, dijkstra } = require('./_graph');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
  const { source, destination, criterion } = body;

  if (!source || !destination) {
    return res.status(400).json({ error: 'Source and destination required' });
  }

  const crit = criterion || state.criterion || 'DISTANCE';
  const plan = dijkstra(source, destination, crit);

  if (!plan.valid) {
    return res.status(400).json({ error: 'No open road route found', plan });
  }

  res.status(200).json(plan);
};
