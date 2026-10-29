const { state } = require('../_graph');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const counts = {};
  state.trips.forEach(t => {
    // each trip visits some locations
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

  res.status(200).json(report);
};
