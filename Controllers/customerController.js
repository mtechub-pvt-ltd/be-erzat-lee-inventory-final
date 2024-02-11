import pool from "../db.config/index.js";
import { getSingleRow } from "../queries/common.js";
export const create = async (req, res) => {
  try {
    const {
      name,
      address,
      contact_no,
      person_in_charge,
      bill_to_name,
      bill_to_address,
    } = req.body;

    const createQuery =
      "INSERT INTO customers (name, address, contact_no, person_in_charge, bill_to_name, bill_to_address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *";

    const result = await pool.query(createQuery, [
      name,
      address,
      contact_no,
      person_in_charge,
      bill_to_name,
      bill_to_address,
    ]);

    if (result.rowCount === 1) {
      return res.status(201).json({
        statusCode: 201,
        message: "New customer added successfully",
        data: result.rows[0],
      });
    }

    res.status(400).json({
      statusCode: 400,
      message: "Customer could not be created. Please try again!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};

export const deleteCustomer = async (req, res) => {
  const { id } = req.params;
  try {
    const condition = {
      column: "id",
      value: id,
    };
    const checkCustomerExist = await getSingleRow("customers", condition);
    if (checkCustomerExist.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Customers not found " });
    }

 // Step 1: Identify order IDs associated with the customer
 const customerOrders = await pool.query(
  'SELECT id FROM public.orders WHERE customer_id = $1',
  [id]
);

// Step 2: Delete records from the invoices table
await pool.query(
  'DELETE FROM public.invoices WHERE id IN (SELECT invoice_id FROM public.order_in_invoices WHERE order_id = ANY($1))',
  [customerOrders.rows.map(order => order.id)]
);
// Step 3: Delete records from the order_in_invoices table
await pool.query(
  'DELETE FROM public.order_in_invoices WHERE order_id = ANY($1)',
  [customerOrders.rows.map(order => order.id)]
);



// Step 4: Delete records from the orders table
await pool.query(
  'DELETE FROM public.orders WHERE id = ANY($1)',
  [customerOrders.rows.map(order => order.id)]
);


    const delQuery = "DELETE FROM customers WHERE id=$1";
    const result = await pool.query(delQuery, [id]);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Customer not deleted" });
    }

    res
      .status(200)
      .json({ statusCode: 200, message: "Customer deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const updateCustomer = async (req, res) => {
  try {
    const {
      id,
      name,
      address,
      contact_no,
      person_in_charge,
      bill_to_name,
      bill_to_address,
    } = req.body;
    
    const query = "SELECT * FROM customers WHERE id=$1";
    const oldCustomer = await pool.query(query, [id]);

    if (oldCustomer.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const updateCustomer = `
      UPDATE customers
      SET
        name = $2,
        address = $3,
        contact_no = $4,
        person_in_charge = $5,
        bill_to_name = $6,
        bill_to_address = $7,
        "updated_at" = NOW()
      WHERE id = $1
      RETURNING *`;

    const result = await pool.query(updateCustomer, [
      id,
      name,
      address,
      contact_no,
      person_in_charge,
      bill_to_name,
      bill_to_address
    ]);

    if (result.rowCount === 1) {
      return res.status(200).json({
        statusCode: 200,
        customer: result.rows[0],
      });
    } else {
      res.status(404).json({ statusCode: 404, message: "Operation not successful" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllCustomers = async (req, res) => {
  try {
    let page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 5);
    page = page + 1;
    const offset = (page - 1) * perPage;
    // const supplierQuery=`SELECT * FROM customers ORDER BY customers.created_at DESC LIMIT $1 OFFSET $2;`

    const customerQuery = `SELECT
      customers.*,
COUNT(DISTINCT orders.id) AS total_orders,
SUM(CASE WHEN invoices.status = 'Paid' THEN 1 ELSE 0 END) AS total_paid_orders,
SUM(CASE WHEN invoices.status = 'Unpaid' THEN 1 ELSE 0 END) AS total_unpaid_orders
FROM
customers
LEFT JOIN
orders
ON
customers.id = orders.customer_id


LEFT JOIN
order_in_invoices
ON
orders.id = order_in_invoices.order_id

LEFT JOIN
invoices
ON
order_in_invoices.invoice_id = invoices.id
GROUP BY
customers.id, customers.name
ORDER BY
  customers.created_at DESC
LIMIT $1 OFFSET $2;
`;
    const { rows } = await pool.query(customerQuery, [perPage, offset]);
    // Calculate the total number of forums (without pagination)
    const totalCustomersQuery = `SELECT COUNT(*) AS total FROM public.customers `;
    const totalCustomerResult = await pool.query(totalCustomersQuery);
    const totalCustomer = totalCustomerResult.rows[0].total;
    const totalPages = Math.ceil(totalCustomer / perPage);
    res
      .status(200)
      .json({ statusCode: 200, totalCustomer, totalPages, AllCustomer: rows });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
export const getAllCustomerswithoutPagination = async (req, res) => {
  try {
    const supplierQuery = `SELECT * FROM customers ORDER BY customers.created_at DESC`;
    const { rows } = await pool.query(supplierQuery);
    const gst=await pool.query(`SELECT gst_amount FROM company_data`)
    res.status(200).json({ statusCode: 200, AllCustomers: rows,gst_amount:gst.rows[0].gst_amount });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
export const getSpecificCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customerQuery = `SELECT * FROM customers  WHERE id=$1`;
    const { rows } = await pool.query(customerQuery, [id]);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Customer not found" });
    }
    res.status(200).json({ statusCode: 200, Customer: rows[0] });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
export const searchCustomer = async (req, res) => {
  try {
    const { name } = req.query;

    // Split the search query into individual words
    const searchWords = name.split(/\s+/).filter(Boolean);

    if (searchWords.length === 0) {
      return res.status(200).json({ statusCode: 200, Customers: [] });
    }

    // Create an array of conditions for each search word
    const conditions = searchWords.map((word) => {
      // return `name ILIKE '%${word}%'`; // Use ILIKE for case-insensitive search
      return `(name ILIKE '%${word}%' OR customers.id::text ILIKE '%${word}%')`; 
    });
//     const customerQuery = `SELECT
//         customers.*,
//   COUNT(DISTINCT orders.id) AS total_orders,
//   SUM(CASE WHEN invoices.status = 'Paid' THEN 1 ELSE 0 END) AS total_paid_orders,
//   SUM(CASE WHEN invoices.status = 'Unpaid' THEN 1 ELSE 0 END) AS total_unpaid_orders
//   FROM
//   customers
//   LEFT JOIN
//   orders
//   ON
//   customers.id = orders.customer_id
//   LEFT JOIN
//   invoices
//   ON
//   orders.id = invoices.order_id
//   WHERE ${conditions.join(" OR ")}
//   GROUP BY
//   customers.id, customers.name
// ORDER BY
// customers.created_at DESC
//   `;
  const customerQuery = `SELECT
      customers.*,
COUNT(DISTINCT orders.id) AS total_orders,
SUM(CASE WHEN invoices.status = 'Paid' THEN 1 ELSE 0 END) AS total_paid_orders,
SUM(CASE WHEN invoices.status = 'Unpaid' THEN 1 ELSE 0 END) AS total_unpaid_orders
FROM
customers
LEFT JOIN
orders
ON
customers.id = orders.customer_id


LEFT JOIN
order_in_invoices
ON
orders.id = order_in_invoices.order_id

LEFT JOIN
invoices
ON
order_in_invoices.invoice_id = invoices.id
WHERE ${conditions.join(" OR ")}
GROUP BY
customers.id, customers.name
ORDER BY
  customers.created_at DESC
`;
    const { rows } = await pool.query(customerQuery);

    return res
      .status(200)
      .json({ statusCode: 200, totalResults: rows.length, Customers: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const countCustomer = async (req, res) => {
  try {
    const totalCustomersQuery = `SELECT COUNT(*) AS total FROM public.customers `;
    const { rows } = await pool.query(totalCustomersQuery);
    res.status(200).json({ statusCode: 200, totalCustomer: rows[0].total });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
