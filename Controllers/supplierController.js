import pool from "../db.config/index.js";
import { getAllRows, getSingleRow } from "../queries/common.js";
export const create = async (req, res) => {
  try {
    const { name } = req.body;
    const createQuery = "INSERT INTO suppliers (name) VALUES ($1) RETURNING *";
    const result = await pool.query(createQuery, [name]);

    if (result.rowCount === 1) {
      return res.status(201).json({
        statusCode: 201,
        message: "Created successfully",
        data: result.rows[0],
      });
    }
    res.status(400).json({ statusCode: 400, message: "Not created" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const deleteSupplier = async (req, res) => {
  const { id } = req.params;
  try {
    const condition = {
      column: "id",
      value: id,
    };
    const oldImage = await getSingleRow("suppliers", condition);
    if (oldImage.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Supplier not found " });
    }
 // Step 1: Identify order IDs associated with the customer
 const supplierOrders = await pool.query(
  'SELECT id FROM public.orders WHERE supplier_id = $1',
  [id]
);

// Step 2: Delete records from the invoices table
await pool.query(
  'DELETE FROM public.invoices WHERE id IN (SELECT invoice_id FROM public.order_in_invoices WHERE order_id = ANY($1))',
  [supplierOrders.rows.map(order => order.id)]
);
// Step 3: Delete records from the order_in_invoices table
await pool.query(
  'DELETE FROM public.order_in_invoices WHERE order_id = ANY($1)',
  [supplierOrders.rows.map(order => order.id)]
);



// Step 4: Delete records from the orders table
await pool.query(
  'DELETE FROM public.orders WHERE id = ANY($1)',
  [supplierOrders.rows.map(order => order.id)]
);
    const delQuery = "DELETE FROM suppliers WHERE id=$1";
    const result = await pool.query(delQuery, [id]);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Supplier not deleted" });
    }

    res
      .status(200)
      .json({ statusCode: 200, message: "Supplier deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const updateSupplier = async (req, res) => {
  try {
    const { name, id } = req.body;
    const query = "SELECT * FROM suppliers WHERE id=$1";
    const oldSupplier = await pool.query(query, [id]);
    if (oldSupplier.rows.length === 0) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const updateSupplier = `UPDATE suppliers SET name=$1, "updated_at"=NOW() WHERE id=$2 RETURNING *`;
    const result = await pool.query(updateSupplier, [name, id]);
    if (result.rowCount === 1) {
      return res
        .status(200)
        .json({ statusCode: 200, Supplier: result.rows[0] });
    } else {
      res
        .status(404)
        .json({ statusCode: 404, message: "Operation not successfull" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getAllSuppliers = async (req, res) => {
  try {
    let page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage=parseInt(req.query.limit || 5);
    page=page+1
    const offset = (page - 1) * perPage;
const supplierQuery=`SELECT
suppliers.*,
COUNT(DISTINCT orders.id) AS total_orders,
SUM(CASE WHEN oi.status = 'Paid' THEN 1 ELSE 0 END) AS total_paid_orders,
SUM(CASE WHEN oi.status = 'Unpaid' THEN 1 ELSE 0 END) AS total_unpaid_orders
FROM
suppliers
LEFT JOIN
orders
ON
suppliers.id = orders.supplier_id
LEFT JOIN
(
    SELECT
        oii.order_id,
        MAX(i.status) AS status
    FROM
        order_in_invoices oii
    LEFT JOIN
        invoices i
    ON
        oii.invoice_id = i.id
    GROUP BY
        oii.order_id
) AS oi
ON
orders.id = oi.order_id
GROUP BY
suppliers.id, suppliers.name
ORDER BY
suppliers.created_at DESC
LIMIT $1 OFFSET $2;

`

    const { rows } = await pool.query(supplierQuery, [perPage, offset]);
    // Calculate the total number of forums (without pagination)
    const totalSuppliersQuery = `SELECT COUNT(*) AS total FROM public.suppliers `;
    const totalSupplierResult = await pool.query(totalSuppliersQuery);
    const totalSupplier = totalSupplierResult.rows[0].total;
    const totalPages = Math.ceil(totalSupplier / perPage);
    res
      .status(200)
      .json({ statusCode: 200, totalSupplier, totalPages, AllSuppliers: rows });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
export const getAllSupplierswithoutPagination = async (req, res) => {
  try {
    const supplierQuery = `SELECT * FROM suppliers ORDER BY suppliers.created_at DESC`;
    const { rows } = await pool.query(supplierQuery);
    const companyData = await pool.query(`SELECT * FROM company_data`);
    
    res.status(200).json({
      statusCode: 200,
      AllSuppliers: rows,
      companyData: companyData.rows[0]
    });
    
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
export const getSpecificSuppliers = async (req, res) => {
  try {
    const { id } = req.params;
    let page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage=parseInt(req.query.limit || 5);
    page=page+1
    const offset = (page - 1) * perPage;
    const supplierQuery = `
    SELECT
      s.id AS supplier_id,
      s.name AS supplier_name,
      COUNT(o.id) AS total_orders,
      ARRAY_AGG(
        JSONB_BUILD_OBJECT(
          'order_id', o.id,
          'total_products', o.total_products,
          'created_at', o.created_at
        ) ORDER BY o.created_at
      ) AS order_details
    FROM
      suppliers s
    LEFT JOIN (
      SELECT
        o.id,
        o.supplier_id,
        COUNT(pio.id) AS total_products,
        o.created_at
      FROM
        orders o
      LEFT JOIN
        product_in_order pio ON o.id = pio.order_id
      WHERE o.supplier_id = $1
      GROUP BY
        o.id, o.supplier_id, o.created_at
      ORDER BY
        o.created_at
      LIMIT $2 OFFSET $3
    ) o ON s.id = o.supplier_id
    WHERE s.id = $1
    GROUP BY
      s.id, s.name
    ORDER BY
      s.id;
  `;

    const { rows } = await pool.query(supplierQuery, [id,perPage, offset]);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Supplier not found" });
    }
      // Calculate the total number of forums (without pagination)
      const totalSuppliersOrderQuery = `SELECT COUNT(*) AS total FROM public.orders WHERE orders.supplier_id=$1 `;
      const totalSupplierOrderResult = await pool.query(totalSuppliersOrderQuery,[id]);
      const totalOrders = totalSupplierOrderResult.rows[0].total;
      const totalPages = Math.ceil(totalOrders / perPage);
      res
        .status(200)
        .json({ statusCode: 200,  Supplier: {...rows[0],totalOrders, totalPages} });
    
    // res.status(200).json({ statusCode: 200, Supplier: rows[0] });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
export const searchSupplier = async (req, res) => {
  try {
    const { name } = req.query;

    // Split the search query into individual words
    const searchWords = name.split(/\s+/).filter(Boolean);

    if (searchWords.length === 0) {
      return res.status(200).json({ statusCode: 200, Suppliers: [] });
    }

    // Create an array of conditions for each search word
    const conditions = searchWords.map((word) => {
      // return `name ILIKE '%${word}%'`; // Use ILIKE for case-insensitive search
      return `(name ILIKE '%${word}%' OR suppliers.id::text ILIKE '%${word}%')`; 
    });

    const supplierQuery=`SELECT
    suppliers.*,
    COUNT(DISTINCT orders.id) AS total_orders,
    SUM(CASE WHEN oi.status = 'Paid' THEN 1 ELSE 0 END) AS total_paid_orders,
    SUM(CASE WHEN oi.status = 'Unpaid' THEN 1 ELSE 0 END) AS total_unpaid_orders
    FROM
    suppliers
    LEFT JOIN
    orders
    ON
    suppliers.id = orders.supplier_id
    LEFT JOIN
    (
        SELECT
            oii.order_id,
            MAX(i.status) AS status
        FROM
            order_in_invoices oii
        LEFT JOIN
            invoices i
        ON
            oii.invoice_id = i.id
        GROUP BY
            oii.order_id
    ) AS oi
    ON
    orders.id = oi.order_id
    WHERE ${conditions.join(" OR ")}
    GROUP BY
    suppliers.id, suppliers.name
    ORDER BY
    suppliers.created_at DESC
    
    `
    const { rows } = await pool.query(supplierQuery);
    return res
      .status(200)
      .json({ statusCode: 200, totalResults: rows.length, Suppliers: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const searchSupplierOrder = async (req, res) => {
  try {
    const { search } = req.query;

    // Split the search query into individual words
    const searchWords = search.split(/\s+/).filter(Boolean);

    // Create an array of conditions for each search word
    const conditions = searchWords.map((word) => {
      return `id ILIKE '%${word}%'`; // Use ILIKE for case-insensitive search
    });

    if (searchWords.length === 0) {
      return res.status(200).json({ statusCode: 200, Orders: [] });
    }

    const supplierQuery = `SELECT
      s.id AS supplier_id,
      s.name AS supplier_name,
      COUNT(o.id) AS total_orders,
      ARRAY_AGG(
          JSONB_BUILD_OBJECT(
              'order_id', o.id,
              'total_products', o.total_products,
              'created_at', o.created_at
          ) ORDER BY o.created_at
      ) AS order_details
  FROM
      suppliers s
  LEFT JOIN (
      SELECT
          o.id,
          o.supplier_id,
          COUNT(pio.id) AS total_products,
          o.created_at
      FROM
          orders o
      LEFT JOIN
          product_in_order pio ON o.id = pio.order_id
      GROUP BY
          o.id, o.supplier_id, o.created_at
  ) o ON s.id = o.supplier_id
  WHERE o.id=$1
  GROUP BY
      s.id, s.name
  ORDER BY
      s.created_at;
  `;
    // Fetch data based on the search query
    const { rows } = await pool.query(supplierQuery, [search]);

    // Return the search results
    return res.status(200).json({ statusCode: 200, Orders: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const countSupplier = async (req, res) => {
  try {
    const totalSuppliersQuery = `SELECT COUNT(*) AS total FROM public.suppliers `;
    const { rows } = await pool.query(totalSuppliersQuery);
    res.status(200).json({ statusCode: 200, totalSupplier: rows[0].total });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
