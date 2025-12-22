// db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'safevote_app',
  password: process.env.DB_PASSWORD || 'Brian9124@',
  database: process.env.DB_NAME || 'safevote_tracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
