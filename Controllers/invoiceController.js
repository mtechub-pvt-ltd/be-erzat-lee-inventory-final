import pool from "../db.config/index.js";
export const create = async (req, res) => {
  try {
    let {
      bill_to_address,
      ship_to_address,
      due_date,
      order_id,
      products,
      orderType
    } = req.body;
    console.log(products);
    const min = 100000; // Minimum 6-digit number (100000)
    const max = 999999; // Maximum 6-digit number (999999)
  
    // Generate a random number between min and max
    const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    if (!Array.isArray(order_id)) {
      order_id = [order_id];
    }



    const insertQuery = `
          INSERT INTO invoices ( bill_to_address, ship_to_address, due_date,receipt_no)
          VALUES ($1, $2, $3,$4) RETURNING *
        `;
    const result = await pool.query(insertQuery, [
      // id,
      bill_to_address,
      ship_to_address,
      due_date,
      randomNumber

    ]);
    for (const id of order_id) {
      await pool.query(
        `INSERT INTO order_in_invoices(invoice_id,order_id) VALUES ($1,$2) RETURNING * `,
        [result.rows[0].id, id]
      );
    }

    for (const product of products) {
      if(orderType==='customer'){
        const minusProductQuery = `UPDATE products
        SET quantity = CASE
          WHEN quantity > 0 THEN quantity - ${product.product_quantity}
          ELSE quantity
        END
        WHERE id = $1
        `;
        await pool.query(minusProductQuery, [
          product.product_id,
        ]);
      }else{
        const minusProductQuery = `UPDATE products
        SET quantity = CASE
          WHEN quantity > 0 THEN quantity + ${product.product_quantity}
          ELSE quantity
        END
        WHERE id = $1
        `;
         await pool.query(minusProductQuery, [
          product.product_id,
        ]);
      }
     
     

      // if (minusProductResult.rowCount === 0) {
      //   // Product not in stock, return an error response
      //   return res
      //     .status(400)
      //     .json({ statusCode: 400, message: "Product is out of stock" });
      // }
    }
     
    res.status(201).json({
      message: "Invoice created successfully",
      invoice: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const updateInvoices = async (req, res) => {
  try {
    const {
      invoiceId,
      bill_to_address,
      ship_to_address,
      due_date,
      order_id,
    } = req.body;
    console.log(req.body);
    const checkInvoiceQuery = `
    SELECT * FROM invoices WHERE id = $1
  `;

  const existingInvoice = await pool.query(checkInvoiceQuery, [invoiceId]);

  if (existingInvoice.rowCount === 0) {
    // If no invoice is found, return a 404 status code
    return res.status(404).json({ message: "Invoice not found" });
  }

     
    const updateInvoiceQuery = `
      UPDATE invoices
      SET bill_to_address = $1, ship_to_address = $2, due_date = $3
      WHERE id = $4
      RETURNING *
    `;

    const updatedInvoice = await pool.query(updateInvoiceQuery, [
      bill_to_address,
      ship_to_address,
      due_date,
      invoiceId,
    ]);

    // Remove existing related order_in_invoices records
    await pool.query(
      `DELETE FROM order_in_invoices WHERE invoice_id = $1`,
      [invoiceId]
    );

    // Insert new order_in_invoices records
    if (Array.isArray(order_id)) {
      for (const id of order_id) {
        await pool.query(
          `INSERT INTO order_in_invoices(invoice_id, order_id) VALUES ($1, $2)`,
          [invoiceId, id]
        );
      }
    }

    res.status(200).json({
      message: "Invoice updated successfully",
      invoice: updatedInvoice.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAllInvoices = async (req, res) => {
  try {
    const {orderType}=req.params
    console.log(orderType);
    let page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 5);
    page = page + 1;
    const offset = (page - 1) * perPage;
const query=`
WITH OrderAggregation AS (
  SELECT
      oii.invoice_id,
      JSON_AGG(
          JSON_BUILD_OBJECT(
              'order_id', o.id,
              'customer_id', o.customer_id,
              'supplier_id', o.supplier_id,
              'orderType', o.orderType,
              'sub_total', o.sub_total,
              'order_status', o.order_status,
              'customer_name', c.name,
              'supplier_name', s.name,
              'total_amount', o.total_amount,
              'discount_type', o.discount_type,
              'discount_amount', o.discount_amount,
              'GST_amount', o.GST_amount,
              'order_created_at', o.created_at,
              'order_updated_at', o.updated_at
          )
      )::jsonb AS orders_array
  FROM
      order_in_invoices oii
  LEFT JOIN
      orders o ON oii.order_id = o.id
  LEFT JOIN
      customers c ON o.customer_id = c.id
  LEFT JOIN
      suppliers s ON o.supplier_id = s.id
      WHERE o.orderType=$3
  GROUP BY
      oii.invoice_id
)
SELECT
  i.*,
  i.status,
  (oa.orders_array)::json AS orders_array,
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'product_id', p.id,
      'product_name', p.name,
      'product_cost_price', p.cost_price,
      'product_sell_price', p.sell_price,
      'quantity', pio.product_quantity
    )
  ) AS products,
  i.created_at AS invoice_created_at,
  i.updated_at AS invoice_updated_at
FROM
  invoices i
LEFT JOIN
  OrderAggregation oa ON i.id = oa.invoice_id
LEFT JOIN
  order_in_invoices oii ON i.id = oii.invoice_id
LEFT JOIN
  product_in_order pio ON oii.order_id = pio.order_id
LEFT JOIN
  products p ON pio.product_id = p.id
WHERE
  EXISTS (
    SELECT 1
    FROM
      OrderAggregation
    WHERE
      invoice_id = i.id
  )
  GROUP BY i.id,oa.orders_array
ORDER BY
  i.created_at DESC
LIMIT $1 OFFSET $2;
    `;
    const result = await pool.query(query,[perPage, offset,orderType]);
     // Calculate the total number of forums (without pagination)
     const totalInvoicesQuery = `
     SELECT COUNT(*) AS total
     FROM public.invoices i
     WHERE EXISTS (
       SELECT 1
       FROM order_in_invoices oii
       WHERE oii.invoice_id = i.id
       AND (
         SELECT o.orderType
         FROM orders o
         WHERE o.id = oii.order_id
       ) = $1
     );
   `;
     const totalInvoiceResult = await pool.query(totalInvoicesQuery,[orderType]);
     const totalInvoice = totalInvoiceResult.rows[0].total;
     const totalPages = Math.ceil(totalInvoice / perPage);
     res
       .status(200)
       .json({ statusCode: 200, totalInvoice, totalPages, invoices: result.rows });

  } catch (error) {
    console.error(error);

    // Handle database errors
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const getSpecificInvoices = async (req, res) => {
  try {
    const { invoice_id } = req.params;
    const query=`
WITH OrderAggregation AS (
  SELECT
      oii.invoice_id,
      JSON_AGG(
          JSON_BUILD_OBJECT(
              'order_id', o.id,
              'customer_id', o.customer_id,
              'supplier_id', o.supplier_id,
              'orderType', o.orderType,
              'sub_total', o.sub_total,
              'order_status', o.order_status,
              'customer_name', c.name,
              'customer_address', c.address,
              'customer_phone', c.contact_no,
              'supplier_name', s.name,

              'total_amount', o.total_amount,
              'discount_type', o.discount_type,
              'discount_amount', o.discount_amount,
              'GST_amount', o.GST_amount,
              'order_created_at', o.created_at,
              'order_updated_at', o.updated_at,
              'products', (
                SELECT JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'product_id', p.id,
                    'product_name', p.name,
                    'product_code', p.code,
                    'product_cost_price', p.cost_price,
                    'product_sell_price', p.sell_price,
                    'quantity', pio.product_quantity
                  )
                )
                FROM product_in_order pio
                JOIN products p ON pio.product_id = p.id
                WHERE pio.order_id = o.id
              )
          )
      )::jsonb AS orders_array

  FROM
      order_in_invoices oii
  LEFT JOIN
      orders o ON oii.order_id = o.id
  LEFT JOIN
      customers c ON o.customer_id = c.id
  LEFT JOIN
      suppliers s ON o.supplier_id = s.id
  GROUP BY
      oii.invoice_id
)
SELECT
  i.*,
  i.status,
  (oa.orders_array)::json AS orders_array,
  i.created_at AS invoice_created_at,
  i.updated_at AS invoice_updated_at
FROM
  invoices i
LEFT JOIN
  OrderAggregation oa ON i.id = oa.invoice_id
  WHERE i.id=$1
ORDER BY
  i.created_at DESC;

    `;

    const result = await pool.query(query, [invoice_id]);
    const invoices = result.rows;

    res.status(200).json({ invoices });
  } catch (error) {
    console.error(error);

    // Handle database errors
    res.status(500).json({ error: "Internal Server Error" });
  } 
};
export const deleteInvoice = async (req, res) => {
  const { invoice_id } = req.params;
  console.log(invoice_id);
  try {
    // Check if the invoice exists
    const checkQuery = "SELECT 1 FROM invoices WHERE id = $1";
    const checkResult = await pool.query(checkQuery, [invoice_id]);

    if (checkResult.rowCount === 0) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Delete the invoice
    const deleteQuery = "DELETE FROM invoices WHERE id = $1";
    await pool.query(deleteQuery, [invoice_id]);

    res.status(200).json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error(error);

    // Handle database errors
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const serchInvoices = async (req, res) => {
  try {
    const { search } = req.query;
    const {orderType}=req.params
//     const query=`
// WITH OrderAggregation AS (
//   SELECT
//       oii.invoice_id,
//       JSON_AGG(
//           JSON_BUILD_OBJECT(
//               'order_id', o.id,
//               'customer_id', o.customer_id,
//               'supplier_id', o.supplier_id,
//               'orderType', o.orderType,
//               'sub_total', o.sub_total,
//               'order_status', o.order_status,
//               'customer_name', c.name,
//               'supplier_name', s.name,
//               'total_amount', o.total_amount,
//               'discount_type', o.discount_type,
//               'discount_amount', o.discount_amount,
//               'GST_amount', o.GST_amount,
//               'order_created_at', o.created_at,
//               'order_updated_at', o.updated_at
//           )
//       )::jsonb AS orders_array
//   FROM
//       order_in_invoices oii
//   LEFT JOIN
//       orders o ON oii.order_id = o.id
//   LEFT JOIN
//       customers c ON o.customer_id = c.id
//   LEFT JOIN
//       suppliers s ON o.supplier_id = s.id
//   GROUP BY
//       oii.invoice_id
// )
// SELECT
//   i.*,
//   i.status,
//   (oa.orders_array)::json AS orders_array,
//   JSON_AGG(
//       JSON_BUILD_OBJECT(
//           'product_id', p.id,
//           'product_name', p.name,
//           'product_cost_price', p.cost_price,
//           'product_sell_price', p.sell_price,
//           'quantity', pio.product_quantity
//       )
//   ) AS products,
//   i.created_at AS invoice_created_at,
//   i.updated_at AS invoice_updated_at,
//   i.created_at AS order_created_at,
//   i.updated_at AS order_updated_at
// FROM
//   invoices i
// LEFT JOIN
//   OrderAggregation oa ON i.id = oa.invoice_id
// LEFT JOIN
//   order_in_invoices oii ON i.id = oii.invoice_id
// LEFT JOIN
//   product_in_order pio ON oii.order_id = pio.order_id
// LEFT JOIN
//   products p ON pio.product_id = p.id
//   WHERE i.id::text ILIKE '%' || $1 || '%'
// GROUP BY
//   i.id, oa.orders_array
// ORDER BY
//   i.created_at DESC
//     `;
    const query=`
    WITH OrderAggregation AS (
      SELECT
          oii.invoice_id,
          JSON_AGG(
              JSON_BUILD_OBJECT(
                  'order_id', o.id,
                  'customer_id', o.customer_id,
                  'supplier_id', o.supplier_id,
                  'orderType', o.orderType,
                  'sub_total', o.sub_total,
                  'order_status', o.order_status,
                  'customer_name', c.name,
                  'supplier_name', s.name,
                  'total_amount', o.total_amount,
                  'discount_type', o.discount_type,
                  'discount_amount', o.discount_amount,
                  'GST_amount', o.GST_amount,
                  'order_created_at', o.created_at,
                  'order_updated_at', o.updated_at
              )
          )::jsonb AS orders_array
      FROM
          order_in_invoices oii
      LEFT JOIN
          orders o ON oii.order_id = o.id
      LEFT JOIN
          customers c ON o.customer_id = c.id
      LEFT JOIN
          suppliers s ON o.supplier_id = s.id
          WHERE o.orderType=$2
      GROUP BY
          oii.invoice_id
    )
    SELECT
      i.*,
      i.status,
      (oa.orders_array)::json AS orders_array,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'product_id', p.id,
          'product_name', p.name,
          'product_cost_price', p.cost_price,
          'product_sell_price', p.sell_price,
          'quantity', pio.product_quantity
        )
      ) AS products,
      i.created_at AS invoice_created_at,
      i.updated_at AS invoice_updated_at
    FROM
      invoices i
    LEFT JOIN
      OrderAggregation oa ON i.id = oa.invoice_id
    LEFT JOIN
      order_in_invoices oii ON i.id = oii.invoice_id
    LEFT JOIN
      product_in_order pio ON oii.order_id = pio.order_id
    LEFT JOIN
      products p ON pio.product_id = p.id
      WHERE
      EXISTS (
        SELECT 1
        FROM
          OrderAggregation
        WHERE
          invoice_id = i.id
      )
      AND i.id::text ILIKE '%' || $1 || '%'
    
      GROUP BY i.id,oa.orders_array
    ORDER BY
      i.created_at DESC
        `;
    const result = await pool.query(query, [search,orderType]);
    const invoices = result.rows;

    res.status(200).json({ invoices });
  } catch (error) {
    console.error(error);

    // Handle database errors
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const updateInvoicesStatus = async (req, res) => {
  const { id, status } = req.body;

  try {
    // Update the invoice in the database
    const updateQuery = `
        UPDATE invoices
        SET
         
          status=$1,
          updated_at=NOW()
        WHERE id = $2
        RETURNING *
      `;

    const result = await pool.query(updateQuery, [status, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.status(200).json({
      message: "Invoice status updated successfully",
      invoice: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const getEStatement = async (req, res) => {
  try {
    const { orderType, customer_id, supplier_id,status, startDate, endDate } = req.body;
console.log(req.body);

// const query = `
//     SELECT
//         invoices.id AS invoice_id,
//         invoices.bill_to_address AS bill_to_address,
//         invoices.ship_to_address AS ship_to_address,
//         invoices.due_date AS due_date,
//         invoices.status AS invoice_status,
//         invoices.created_at AS invoice_created_at,
//         orders.id AS order_id,
//         orders.orderType AS order_type,
//         orders.sub_total AS order_sub_total,
//         orders.order_status AS order_status,
//         orders.total_amount AS order_total_amount,
//         orders.GST_amount AS order_GST_amount,
//         orders.discount_type AS order_discount_type,
//         orders.discount_amount AS order_discount_amount
//     FROM
//         invoices
//     JOIN
//         order_in_invoices ON invoices.id = order_in_invoices.invoice_id
//     JOIN
//         orders ON order_in_invoices.order_id = orders.id

//     WHERE
//         orders.orderType = $1
//         AND (
//           (orders.orderType = 'customer' AND orders.customer_id = $4)
//           OR
//           (orders.orderType = 'supplier' AND orders.supplier_id = $4)
//       )
//         AND invoices.due_date >= $2::DATE
//         AND invoices.due_date <= $3::DATE
//         AND invoices.status = $5
// `;

const query=`SELECT
invoices.id AS invoice_id,
invoices.bill_to_address AS bill_to_address,
invoices.ship_to_address AS ship_to_address,
invoices.due_date AS due_date,
invoices.status AS invoice_status,
invoices.created_at AS invoice_created_at,
orders.id AS order_id,
orders.orderType AS order_type,
orders.sub_total AS order_sub_total,
orders.order_status AS order_status,
orders.total_amount AS order_total_amount,
orders.GST_amount AS order_GST_amount,
orders.discount_type AS order_discount_type,
orders.discount_amount AS order_discount_amount,
customers.id AS customer_id,
customers.name AS customer_name,
customers.address AS customer_address,
suppliers.id AS supplier_id,
suppliers.name AS supplier_name
FROM
invoices
JOIN
order_in_invoices ON invoices.id = order_in_invoices.invoice_id
JOIN
orders ON order_in_invoices.order_id = orders.id
LEFT JOIN
customers ON orders.customer_id = customers.id AND orders.orderType = 'customer'
LEFT JOIN
suppliers ON orders.supplier_id = suppliers.id AND orders.orderType = 'supplier'
WHERE
orders.orderType = $1
AND (
    (orders.orderType = 'customer' AND orders.customer_id = $4)
    OR
    (orders.orderType = 'supplier' AND orders.supplier_id = $4)
)
AND invoices.due_date >= $2::DATE
AND invoices.due_date <= $3::DATE
AND invoices.status = $5;
`



    const result = await pool.query(query, [orderType, startDate, endDate, (orderType === 'customer' ? customer_id : supplier_id),status]);
    // Process the results to group orders by invoice ID
    console.log(result);
const invoicesWithOrders = {};

result.rows.forEach((row) => {
  const invoiceId = row.invoice_id;
  if (!invoicesWithOrders[invoiceId]) {
    invoicesWithOrders[invoiceId] = {
      invoice_id: invoiceId,
      bill_to_address: row.bill_to_address,
      ship_to_address: row.ship_to_address,
      due_date: row.due_date,
      customer_id:row.customer_id,
      customer_name:row.customer_name,
      customer_address:row.customer_address,
      supplier_id:row.supplier_id,
      supplier_name:row.supplier_name,
      orderType,
      invoice_status: row.invoice_status,
      created_at: row.invoice_created_at,
      orders: [],
    };
  }

  invoicesWithOrders[invoiceId].orders.push({
    order_id: row.order_id,
    order_type: row.order_type,
    order_sub_total: row.order_sub_total,
    order_status: row.order_status,
    order_total_amount: row.order_total_amount,
    order_GST_amount: row.order_GST_amount,
    order_discount_type: row.order_discount_type,
    order_discount_amount: row.order_discount_amount,
  });
});

// Convert the object to an array to get the desired format
const invoicesArray = Object.values(invoicesWithOrders);
    
    // const invoices = result.rows;

    res.status(200).json({ invoices :invoicesArray});
  } catch (error) {
    console.error(error);

    // Handle database errors
    res.status(500).json({ error: "Internal Server Error" });
  } 
};
