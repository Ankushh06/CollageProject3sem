const { state } = require('./_graph');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST') {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
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

  res.status(200).json(state.drivers);
};
