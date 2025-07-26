const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQL_ADDON_HOST,
  user: process.env.DB_USER || process.env.MYSQL_ADDON_USER,
  password: process.env.DB_PASS || process.env.MYSQL_ADDON_PASSWORD,
  database: process.env.DB_NAME || process.env.MYSQL_ADDON_DB,
  port: process.env.DB_PORT || process.env.MYSQL_ADDON_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// You can test the connection like this
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ MySQL connected successfully!");
    connection.release(); // Release back to pool
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
  }
})();

module.exports = pool;