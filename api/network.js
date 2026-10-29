const { state } = require('./_graph');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const closedCount = state.roads.filter(r => !r.isActive).length;
  res.status(200).json({
    criterion: state.criterion,
    criterionName: state.criterion === 'TIME' ? 'Fastest TIME (min)' : 'Shortest DISTANCE (km)',
    locations: state.locations,
    roads: state.roads,
    closedCount,
    dbEngine: 'ORACLE / VERCEL',
    dbDetails: 'Vercel Serverless DBMS Engine'
  });
};
