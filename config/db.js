const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20, //increased for scalability
  queueLimit: 0,
  connectTimeout: 10000
});

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    logger.info('MySQL Database connected');
    connection.release();
  } catch (err) {
    logger.error(`Error connecting to MySQL: ${err.message}`);
    process.exit(1);
  }
}

testConnection();

module.exports = pool;
