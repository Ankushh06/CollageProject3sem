const { resetSample } = require('./_graph');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  resetSample();
  res.status(200).json({ success: true, message: 'Sample city reloaded successfully' });
};
