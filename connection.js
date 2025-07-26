const mysql = require('mysql2/promise');
require('dotenv').config();

//Previous connection code commented out

// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASS,
//   database: process.env.DB_NAME,
//   port: process.env.DB_PORT || 3306, // Default MySQL port
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

//Local connection code
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '123@bhik',
  database: 'registration_db',
  port: 3306,
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