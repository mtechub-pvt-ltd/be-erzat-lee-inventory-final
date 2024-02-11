import pool from "../db.config/index.js";


export const getSingleRow = async (tableName, condition) => {
    const query = `SELECT * FROM ${tableName} WHERE ${condition.column} = $1`;
    const result = await pool.query(query, [condition.value]);
    return result.rows;
  };
export const getAllRows = async (tableName) => {
    const query = `SELECT * FROM ${tableName} ORDER BY ${tableName}.id`;
    const result = await pool.query(query);
    return result.rows;
  };
  
  export const insertRow = async (tableName, data) => {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
  
    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows;
  };
  export const updateRow = async (tableName, id, data) => {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');
  
    const query = `UPDATE ${tableName} SET ${placeholders} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id, ...values]);
    return result.rows;
  };
  export const deleteRow = async (tableName, column) => {
    const query = `DELETE FROM ${tableName} WHERE ${column} = $1 RETURNING *`;
    const result = await pool.query(query, [id]);
    return result.rows;
  };
      