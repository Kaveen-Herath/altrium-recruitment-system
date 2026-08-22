require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Reads the private datavase connection string from .env
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;