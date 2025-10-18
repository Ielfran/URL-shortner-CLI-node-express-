const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  connectTimeout: 10000
});

async function initializeDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectTimeout: 10000
    });
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf-8');
    const queries = schemaSql.split(';').filter(query => query.trim());

    for (const query of queries) {
      await connection.query(query);
    }

    logger.info('Database schema initialized successfully');
  } catch (err) {
    logger.error(`Error initializing database: ${err.message}`);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

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

async function initialize() {
  await initializeDatabase();
  await testConnection();
}

initialize();

module.exports = pool;
