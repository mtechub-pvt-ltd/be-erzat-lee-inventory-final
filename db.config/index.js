import pkg from 'pg';
import { databaseConfig } from './db.js';
import fs from 'fs'
const { Pool } = pkg;
const pool = new Pool(databaseConfig);
  pool.on('error', (err) => {
    console.error('Database connection error:', err);
    process.exit(-1);
  });
  pool.connect((err, client, release) => {
    if (err) {
      console.error('Error connecting to database:', err);
    } else {
      console.log('Connected to database successfully');
  
      release();
    }
  });
  const initSql = fs.readFileSync("model/init.sql").toString();
  pool.query(initSql, (err, result) => {
    if (!err) {
      console.log("All Database tables Initialilzed successfully : ")
    }
    else {
      console.log("Error Occurred While Initializing Database tables");
      console.log(err.stack)
    }
  })
export default pool;
