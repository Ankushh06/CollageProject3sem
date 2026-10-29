const { state } = require('./_graph');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST') {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
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
      state.roads.push({
        roadId: state.roads.length + 1,
        locA: from,
        locB: to,
        distanceKm: Number(distance),
        travelTimeMin: Number(time),
        isActive: true
      });
    }

    state.audit.unshift({
      id: state.audit.length + 1,
      changedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      roadId: existing ? existing.roadId : state.roads.length,
      action: existing ? 'UPDATED' : 'ADDED',
      details: `${from} ⟷ ${to} (${distance} km, ${time} min)`
    });

    return res.status(200).json({ success: true });
  }

  res.status(200).json(state.roads);
};
