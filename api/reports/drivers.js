const { state } = require('../_graph');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const report = state.drivers.map(d => {
    const driverTrips = state.trips.filter(t => t.driver === d.name);
    const totalKm = driverTrips.reduce((acc, t) => acc + (t.km || 0), 0);
    const totalMin = driverTrips.reduce((acc, t) => acc + (t.min || 0), 0);
    const avgMinutes = driverTrips.length > 0 ? (totalMin / driverTrips.length) : 0;
    return {
      driver: d.name,
      trips: driverTrips.length,
      totalKm,
      avgMinutes
    };
  });

  res.status(200).json(report);
};
