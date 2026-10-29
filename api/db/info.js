module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const isOracleEnv = Boolean(process.env.ORACLE_HOST || process.env.ORACLE_SERVICE);

  res.status(200).json({
    engine: isOracleEnv ? 'ORACLE' : 'ORACLE / VERCEL',
    details: isOracleEnv ? `Oracle Cloud Database (${process.env.ORACLE_SERVICE || 'FREEPDB1'})` : 'Vercel Serverless DBMS Engine (Active)',
    isOracle: isOracleEnv,
    host: process.env.ORACLE_HOST || 'localhost',
    port: process.env.ORACLE_PORT || '1521',
    service: process.env.ORACLE_SERVICE || 'FREEPDB1',
    user: process.env.ORACLE_USER || 'SYSTEM'
  });
};
