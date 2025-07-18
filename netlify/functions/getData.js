const sql = require('mssql');

const config = {
  user: 'sa',
  password: '@TCST1h@b0110',
  server: '7.tcp.ngrok.io',
  port: 22495,
  database: 'graveyard',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

exports.handler = async function (event, context) {
  try {
    // Connect to the MSSQL database
    await sql.connect(config);

    // Query to get all joined deceased + plot data
    const result = await sql.query(`
      SELECT d.DecID, d.DecNama, d.DecSurname, d.Sex, d.DoB, d.DoD, d.Permit,
             p.Lot, p.Block, p.Grave, p.Status, p.lat, p.lng
      FROM Deceased d
      INNER JOIN Plot p ON d.Permit = p.Permit;
    `);

    return {
      statusCode: 200,
      body: JSON.stringify(result.recordset),
      headers: {
        'Access-Control-Allow-Origin': '*', // update with Netlify frontend domain if needed
        'Content-Type': 'application/json'
      }
    };
  } catch (err) {
    console.error('❌ Netlify function error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch data', details: err.message }),
    };
  }
};
