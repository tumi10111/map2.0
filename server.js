const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: 'https://cheerful-tiramisu-4e0b78.netlify.app',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// MSSQL Config
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

let pool;

// Connect to DB and start server
(async function startServer() {
  try {
    pool = await sql.connect(config);
    console.log('✅ MSSQL connected');
    app.listen(PORT, () => {
      console.log(`✅ Server running at https://map2-0.onrender.com:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to DB:', err);
  }
})();

// ==========================
// OCCUPIED PLOTS
// ==========================

// GET: All Occupied Plots
app.get('/api/plot', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT d.DecID, d.DecNama, d.DecSurname, d.Sex, d.DoB, d.DoD, d.Permit,
             p.Lot, p.Block, p.Grave, p.Status, p.lat, p.lng
      FROM Deceased d
      INNER JOIN Plot p ON d.Permit = p.Permit;
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('❌ Error fetching occupied plots:', err);
    res.status(500).json({ error: 'Failed to fetch occupied plots' });
  }
});

// POST: Add new occupied plot
app.post('/api/plot', async (req, res) => {
  const {
    DecID, DecNama, DecSurname, DoB, DoD,
    sex, Permit, Lot, Block, Grave, Status, lat, lng
  } = req.body;

  try {
    // Insert into Deceased table
    await pool.request()
      .input('DecID', sql.VarChar, DecID)
      .input('DecNama', sql.VarChar, DecNama)
      .input('DecSurname', sql.VarChar, DecSurname)
      .input('DoB', sql.Date, DoB)
      .input('DoD', sql.Date, DoD)
      .input('Sex', sql.VarChar, sex)
      .input('Permit', sql.VarChar, Permit)
      .query(`
        INSERT INTO Deceased (DecID, DecNama, DecSurname, DoB, DoD, Sex, Permit)
        VALUES (@DecID, @DecNama, @DecSurname, @DoB, @DoD, @Sex, @Permit)
      `);

    // Insert into Plot table
    const result = await pool.request()
      .input('Permit', sql.VarChar, Permit)
      .input('Lot', sql.VarChar, Lot)
      .input('Block', sql.VarChar, Block)
      .input('Grave', sql.VarChar, Grave)
      .input('Status', sql.VarChar, Status)
      .input('lat', sql.Float, lat)
      .input('lng', sql.Float, lng)
      .query(`
        INSERT INTO Plot (Permit, Lot, Block, Grave, Status, lat, lng)
        OUTPUT INSERTED.*
        VALUES (@Permit, @Lot, @Block, @Grave, @Status, @lat, @lng)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error('❌ Error inserting occupied plot:', err);
    res.status(500).json({ error: 'Failed to insert plot data' });
  }
});

// DELETE: Remove plot by Permit
app.delete('/api/plot/:permit', async (req, res) => {
  const { permit } = req.params;
  try {
    await pool.request()
      .input('Permit', sql.VarChar, permit)
      .query(`
        DELETE FROM Deceased WHERE Permit = @Permit;
        DELETE FROM Plot WHERE Permit = @Permit;
      `);
    res.status(204).send();
  } catch (err) {
    console.error('❌ Error deleting plot:', err);
    res.status(500).json({ error: 'Failed to delete plot' });
  }
});

// ==========================
// AVAILABLE PLOTS
// ==========================

// GET: Available Plots
app.get('/api/available', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT p.Permit, p.Lot, p.Block, p.Grave, p.Status, p.lat, p.lng
      FROM Plot p
      LEFT JOIN Deceased d ON p.Permit = d.Permit
      WHERE d.Permit IS NULL;
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('❌ Error fetching available plots:', err);
    res.status(500).json({ error: 'Failed to fetch available plots' });
  }
});

// POST: Add available plot
app.post('/api/available', async (req, res) => {
  const { Permit, Lot, Block, Grave, Status, lat, lng } = req.body;

  try {
    const result = await pool.request()
      .input('Permit', sql.VarChar, Permit)
      .input('Lot', sql.VarChar, Lot)
      .input('Block', sql.VarChar, Block)
      .input('Grave', sql.VarChar, Grave)
      .input('Status', sql.VarChar, Status)
      .input('lat', sql.Float, lat)
      .input('lng', sql.Float, lng)
      .query(`
        INSERT INTO Plot (Permit, Lot, Block, Grave, Status, lat, lng)
        OUTPUT INSERTED.*
        VALUES (@Permit, @Lot, @Block, @Grave, @Status, @lat, @lng)
      `);
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error('❌ Error inserting available plot:', err);
    res.status(500).json({ error: 'Failed to insert available plot' });
  }
});

// Health Check Route
app.get('/', (req, res) => {
  res.send('Backend is running ✅');
});

// Serve frontend (if deployed statically)
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
