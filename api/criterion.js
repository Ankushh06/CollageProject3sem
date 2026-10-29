const { state } = require('./_graph');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST') {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
    state.criterion = (body.criterion === 'TIME') ? 'TIME' : 'DISTANCE';
  }

  res.status(200).json({
    criterion: state.criterion,
    criterionName: state.criterion === 'TIME' ? 'Fastest TIME (min)' : 'Shortest DISTANCE (km)'
  });
};
