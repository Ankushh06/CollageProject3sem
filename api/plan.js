const { state, planTSP } = require('./_graph');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
  const { depot = 'Warehouse', stops = [], returnToDepot = true, criterion } = body;

  const crit = criterion || state.criterion || 'DISTANCE';
  const plan = planTSP(depot, stops, returnToDepot, crit);

  if (!plan.valid) {
    return res.status(400).json({ error: plan.error || 'Could not plan multi-stop delivery route', plan });
  }

  res.status(200).json(plan);
};
