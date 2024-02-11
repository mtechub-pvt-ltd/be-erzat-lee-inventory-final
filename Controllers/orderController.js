import pool from "../db.config/index.js";
import { getSingleRow } from "../queries/common.js";
export const create = async (req, res) => {
  try {
    const {
      selectedProducts,
      totalAmount,
      GST_amount,
      name_id,
      orderType,
      discountType,
      discountPrice,
      subTotal,
      clientNote
    } = req.body;
    console.log(req.body);

    const isCustomerOrder = orderType === "customer" ? true : false;
    // const idToInsert = isCustomerOrder ? customer_id : supplier_id;
    const createQuery = ` INSERT INTO orders (${
      isCustomerOrder ? "customer_id" : "supplier_id"
    },total_amount,GST_amount,discount_type,discount_amount,orderType,sub_total,client_note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`;
    const result = await pool.query(createQuery, [
      name_id,
      totalAmount,
      GST_amount,
      discountType,
      discountPrice,
      orderType,
      subTotal,
      clientNote
    ]);
    if (result.rowCount === 0) {
      return res.status(400).json({ statusCode: 400, message: "Not created" });
    }
    for (const product of selectedProducts) {
      const query =
        "INSERT INTO product_in_order (product_id,order_id,product_quantity) VALUES ($1,$2,$3) RETURNING *";
      const result1 = await pool.query(query, [
        product.product_id,
        result.rows[0].id,
        product.quantity,
      ]);

      if (result1.rowCount === 0) {
        await pool.query("DELETE FROM orders WHERE id=$1", [result.rows[0].id]);
        await pool.query("DELETE FROM product_in_order WHERE order_id=$1", [
          result.rows[0].id,
        ]);
      }
      // const minusProductQuery = `UPDATE products
      // SET quantity = CASE
      //   WHEN quantity > 0 THEN quantity - ${product.quantity}
      //   ELSE quantity
      // END
      // WHERE id = $1
      // `;
      // const minusProductResult = await pool.query(minusProductQuery, [
      //   product.product_id,
      // ]);

      // if (minusProductResult.rowCount === 0) {
      //   // Product not in stock, return an error response
      //   return res
      //     .status(400)
      //     .json({ statusCode: 400, message: "Product is out of stock" });
      // }
    }

    const getQuery = `SELECT * FROM product_in_order WHERE order_id=$1`;
    const getResult = await pool.query(getQuery, [result.rows[0].id]);
    return res.status(201).json({
      statusCode: 201,
      message: "New order added successfully",
      data: {
        ...result.rows[0],
        products: getResult.rows,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const updateOrder = async (req, res) => {
  try {
    const { order_id, customer_id, supplier_id, products } = req.body;
    const query = "SELECT * FROM orders WHERE id=$1";
    const oldOrder = await pool.query(query, [order_id]);
    if (oldOrder.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    let total_amount = 0;
    let GST_amount = 0;
    console.log(products);
    for (const product of products) {
      if (customer_id) {
        let total = product.product_sell_price * product.quantity;
        total_amount += total;
      } else {
        let total = product.product_cost_price * product.quantity;
        total_amount += total;
      }
    }

    //gst rate is 2.5%
    GST_amount = (total_amount * 2.5) / 100;
    total_amount += GST_amount;
    console.log(total_amount);
    const updateOrder = `UPDATE orders SET customer_id=$1, supplier_id=$2,total_amount=$3,GST_amount=$4, "updated_at"=NOW() WHERE id=$5 RETURNING *`;
    const result = await pool.query(updateOrder, [
      customer_id,
      supplier_id,
      total_amount,
      GST_amount,
      order_id,
    ]);
    if (result.rowCount === 0) {
      return res
        .status(400)
        .json({ statusCode: 400, message: "Operation not successfull" });
    }
    const deleteResult = await pool.query(
      "DELETE FROM product_in_order WHERE order_id=$1",
      [order_id]
    );
    if (deleteResult.rowCount === 0) {
      return res
        .status(400)
        .json({ statusCode: 400, message: "Operation not successfull" });
    }
    for (const product of products) {
      const query =
        "INSERT INTO product_in_order (product_id,order_id,product_quantity) VALUES ($1,$2,$3) RETURNING *";
      const result1 = await pool.query(query, [
        product.product_id,
        order_id,
        product.quantity,
      ]);
      if (result1.rowCount === 0) {
        return res
          .status(400)
          .json({ statusCode: 400, message: "Operation not successfull" });
      }
    }
    const getQuery = `SELECT * FROM product_in_order WHERE order_id=$1`;
    const getResult = await pool.query(getQuery, [result.rows[0].id]);
    res.status(200).json({
      statusCode: 200,
      Order: {
        ...result.rows[0],
        products: getResult.rows,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const deleteOrder = async (req, res) => {
  const { order_id } = req.params;
  try {
    const condition = {
      column: "id",
      value: order_id,
    };
    const oldImage = await getSingleRow("orders", condition);
    if (oldImage.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Order not found " });
    }
      await pool.query(`DELETE FROM product_in_order WHERE order_id=$1`,[order_id])
         // Delete records from the order_in_invoices table for the specific order_id
    await pool.query("DELETE FROM order_in_invoices WHERE order_id = $1", [order_id]);

    // Check if there are invoices no longer associated with any orders
    const orphanedInvoicesQuery = `
      DELETE FROM invoices
      WHERE id NOT IN (SELECT DISTINCT invoice_id FROM order_in_invoices)
    `;
    await pool.query(orphanedInvoicesQuery);
    const delQuery = "DELETE FROM orders WHERE id=$1"; //product images automatically deleted due to cascade
    const result = await pool.query(delQuery, [order_id]);
    if (result.rowCount === 0) {
      return res
        .status(400)
        .json({ statusCode: 400, message: "Order not deleted" });
    }

    res
      .status(200)
      .json({ statusCode: 200, message: "Order deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const cancelOrder = async (req, res) => {
  const { order_id, status } = req.body;
  console.log(req.body);
  try {
    const condition = {
      column: "id",
      value: order_id,
    };
    const oldImage = await getSingleRow("orders", condition);
    if (oldImage.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Order not found " });
    }

    const delQuery = "UPDATE  orders SET order_status=$1 WHERE id=$2"; //product images automatically deleted due to cascade
    const result = await pool.query(delQuery, [status, order_id]);
    if (result.rowCount === 0) {
      return res
        .status(400)
        .json({ statusCode: 400, message: "Order not deleted" });
    }

    res
      .status(200)
      .json({ statusCode: 200, message: "Order cancel successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const getAllOrder = async (req, res) => {
  try {
    const page = req.query.page || 1; // Get the page number from the query parameters
    const perPage = 10; // Set the number of results per page

    // Calculate the offset based on the page number and perPage
    const offset = (page - 1) * perPage;
    const orderQuery = `SELECT
      orders.id AS order_id,
      orders.order_status AS order_status,
      total_amount,
      GST_amount,
      customers.name AS customer_name,
      customers.id AS customer_id,
      suppliers.name AS supplier_name,
      suppliers.id AS supplier_id,
      orders.created_at AS created_at,
      orders.updated_at AS updated_at,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'product_id', product_id,
          'product_quantity', product_quantity,
          'created_at', product_in_order.created_at,
          'updated_at', product_in_order.updated_at
        )
      ) AS products
    FROM
      orders
    LEFT JOIN
      product_in_order
    ON
      orders.id = product_in_order.order_id
      LEFT JOIN
      customers
    ON
      orders.customer_id = customers.id
      LEFT JOIN
      suppliers
    ON
      orders.supplier_id = suppliers.id
      
    GROUP BY
      orders.id,customers.name,customers.id,suppliers.id,suppliers.name, customer_id, supplier_id, total_amount, GST_amount, orders.created_at, orders.updated_at
    ORDER BY
      orders.created_at DESC
    LIMIT $1 OFFSET $2;
    
    `;
    const { rows } = await pool.query(orderQuery, [perPage, offset]);
    // Calculate the total number of forums (without pagination)
    const totalOrdersQuery = `SELECT COUNT(*) AS total FROM public.orders `;
    const totalOrderResult = await pool.query(totalOrdersQuery);
    const totalOrder = totalOrderResult.rows[0].total;
    const totalPages = Math.ceil(totalOrder / perPage);
    res
      .status(200)
      .json({ statusCode: 200, totalOrder, totalPages, AllOrders: rows });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
export const getSpecificOrder = async (req, res) => {
  try {
    const { order_id } = req.params;
    const orderQuery = `
    SELECT
    orders.id AS order_id,
    orders.orderType AS order_type,
    orders.sub_total AS sub_total,
    orders.order_status AS order_status,
    customers.name AS customer_name,
    customers.id AS customer_id,
    suppliers.name AS supplier_name,
    suppliers.id AS supplier_id,
    total_amount,
    GST_amount,
    orders.discount_type AS order_discount_type,
    orders.discount_amount AS order_discount_amount,
    orders.created_at AS created_at,
    orders.updated_at AS updated_at,
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'product_id', product_id,
        'quantity', product_quantity,
        'product_supplier_name', (SELECT name FROM suppliers WHERE suppliers.id = (SELECT supplier_id FROM products WHERE products.id = product_id)),
        'product_name', (SELECT name FROM products WHERE products.id = product_id),
        'product_cost_price', (SELECT cost_price FROM products WHERE products.id = product_id),
        'product_sell_price', (SELECT sell_price FROM products WHERE products.id = product_id),
        'product_code', (SELECT code FROM products WHERE products.id = product_id),
        'product_images', (SELECT JSON_AGG(image_url) FROM product_images WHERE product_images.product_id = product_in_order.product_id) -- Modified join condition here
      )
    ) AS products,
    (SELECT id FROM order_in_invoices WHERE order_in_invoices.order_id = orders.id LIMIT 1) AS invoice_id
FROM
    orders
LEFT JOIN
    product_in_order
ON
    orders.id = product_in_order.order_id
LEFT JOIN
    customers
ON
    orders.customer_id = customers.id
LEFT JOIN
    suppliers
ON
    orders.supplier_id = suppliers.id
WHERE orders.id=$1
GROUP BY
    orders.id, customers.name, customers.id, suppliers.id, suppliers.name, customer_id, supplier_id, total_amount, GST_amount, orders.created_at, orders.updated_at
ORDER BY
    orders.created_at;

`;

    const { rows } = await pool.query(orderQuery, [order_id]);
    const gst=await pool.query(`SELECT gst_amount FROM company_data`)
    if (rows.length) {
      return res.status(200).json({
        statusCode: 200,
        Order: {
          ...rows[0],
        },
        gst:gst.rows[0].gst_amount
      });
    } else {
      res.status(404).json({ statusCode: 404, message: "No order found" });
    }
  } catch (error) {
    console.error(error.stack);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const searchOrder = async (req, res) => {
  try {
    const { search } = req.query;

    // Split the search query into individual words
    const searchWords = search.split(/\s+/).filter(Boolean);

    if (searchWords.length === 0) {
      return res.status(200).json({ statusCode: 200, Orders: [] });
    }
    const orderQuery = `SELECT
    orders.id AS order_id,
    orders.order_status AS order_status,
    orders.orderType AS orderType,
    orders.discount_amount AS discount_amount,
    orders.discount_type AS discount_type,
    total_amount,
    GST_amount,
    customers.name AS customer_name,
    customers.id AS customer_id,
    suppliers.name AS supplier_name,
    suppliers.id AS supplier_id,
    orders.created_at AS created_at,
    orders.updated_at AS updated_at,
    (
      SELECT COUNT(*)
      FROM order_in_invoices oii
      WHERE oii.order_id = orders.id
  ) > 0 AS invoiceExist,
  (
    SELECT oii.invoice_id
    FROM order_in_invoices oii
    WHERE oii.order_id = orders.id
    LIMIT 1
) AS invoice_id, -- Include invoice_id when it exists
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'product_id', product_id,
        'product_quantity', product_quantity,
        'created_at', product_in_order.created_at,
        'updated_at', product_in_order.updated_at
      )
    ) AS products
  FROM
    orders
  LEFT JOIN
    product_in_order
  ON
    orders.id = product_in_order.order_id
    LEFT JOIN
    customers
  ON
    orders.customer_id = customers.id
    LEFT JOIN
    suppliers
  ON
    orders.supplier_id = suppliers.id
    WHERE
    (orders.customer_id IS NOT NULL ) AND
    (
      orders.id::text ILIKE $1
      OR customers.name ILIKE $1
  )
  GROUP BY
    orders.id,customers.name,customers.id,suppliers.id,suppliers.name, customer_id, supplier_id, total_amount, GST_amount, orders.created_at, orders.updated_at
  ORDER BY
    orders.created_at DESC
  
  `;


      const { rows } = await pool.query(orderQuery,[`%${searchWords}%`]);
    return res.status(200).json({ statusCode: 200, Orders: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const searchOrderBySupplier = async (req, res) => {
  try {
    const { search } = req.query;

    // Split the search query into individual words
    const searchWords = search.split(/\s+/).filter(Boolean);

    if (searchWords.length === 0) {
      return res.status(200).json({ statusCode: 200, Orders: [] });
    }
    const orderQuery = `SELECT
    orders.id AS order_id,
    orders.order_status AS order_status,
    orders.orderType AS orderType,
    orders.discount_amount AS discount_amount,
    orders.discount_type AS discount_type,
    total_amount,
    GST_amount,
    customers.name AS customer_name,
    customers.id AS customer_id,
    suppliers.name AS supplier_name,
    suppliers.id AS supplier_id,
    orders.created_at AS created_at,
    orders.updated_at AS updated_at,
    (
      SELECT COUNT(*)
      FROM order_in_invoices oii
      WHERE oii.order_id = orders.id
  ) > 0 AS invoiceExist,
  (
    SELECT oii.invoice_id
    FROM order_in_invoices oii
    WHERE oii.order_id = orders.id
    LIMIT 1
) AS invoice_id, -- Include invoice_id when it exists
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'product_id', product_id,
        'product_quantity', product_quantity,
        'created_at', product_in_order.created_at,
        'updated_at', product_in_order.updated_at
      )
    ) AS products
  FROM
    orders
  LEFT JOIN
    product_in_order
  ON
    orders.id = product_in_order.order_id
    LEFT JOIN
    customers
  ON
    orders.customer_id = customers.id
    LEFT JOIN
    suppliers
  ON
    orders.supplier_id = suppliers.id
    WHERE
    (orders.supplier_id IS NOT NULL ) AND
    (
      orders.id::text ILIKE $1
      OR suppliers.name ILIKE $1
  )
  GROUP BY
    orders.id,customers.name,customers.id,suppliers.id,suppliers.name, customer_id, supplier_id, total_amount, GST_amount, orders.created_at, orders.updated_at
  ORDER BY
    orders.created_at DESC
  
  `;


      const { rows } = await pool.query(orderQuery,[`%${searchWords}%`]);
    return res.status(200).json({ statusCode: 200, Orders: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getAllOrderByCustomer = async (req, res) => {
  try {
    let page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 5);
    page = page + 1;
    const offset = (page - 1) * perPage;

    const orderQuery = `SELECT
        orders.id AS order_id,
        orders.order_status AS order_status,
        orders.orderType AS orderType,
        orders.discount_amount AS discount_amount,
        orders.discount_type AS discount_type,
        total_amount,
        GST_amount,
        customers.name AS customer_name,
        customers.id AS customer_id,
        suppliers.name AS supplier_name,
        suppliers.id AS supplier_id,
        orders.created_at AS created_at,
        orders.updated_at AS updated_at,
        (
          SELECT COUNT(*)
          FROM order_in_invoices oii
          WHERE oii.order_id = orders.id
      ) > 0 AS invoiceExist,
      (
        SELECT oii.invoice_id
        FROM order_in_invoices oii
        WHERE oii.order_id = orders.id
        LIMIT 1
    ) AS invoice_id, -- Include invoice_id when it exists
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'product_id', product_id,
            'product_quantity', product_quantity,
            'created_at', product_in_order.created_at,
            'updated_at', product_in_order.updated_at
          )
        ) AS products
      FROM
        orders
      LEFT JOIN
        product_in_order
      ON
        orders.id = product_in_order.order_id
        LEFT JOIN
        customers
      ON
        orders.customer_id = customers.id
        LEFT JOIN
        suppliers
      ON
        orders.supplier_id = suppliers.id
        WHERE
        orders.customer_id IS NOT NULL
      GROUP BY
        orders.id,customers.name,customers.id,suppliers.id,suppliers.name, customer_id, supplier_id, total_amount, GST_amount, orders.created_at, orders.updated_at
      ORDER BY
        orders.created_at DESC
      LIMIT $1 OFFSET $2;
      
      `;
    const { rows } = await pool.query(orderQuery, [perPage, offset]);
    // Calculate the total number of forums (without pagination)
    const totalOrdersQuery = `SELECT COUNT(*) AS total FROM public.orders WHERE customer_id IS NOT NULL`;
    const totalOrderResult = await pool.query(totalOrdersQuery);
    const totalOrder = totalOrderResult.rows[0].total;
    const totalPages = Math.ceil(totalOrder / perPage);
    res
      .status(200)
      .json({ statusCode: 200, totalOrder, totalPages, AllOrders: rows });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
export const getAllOrderBySupplier = async (req, res) => {
  try {
    let page = parseInt(req.query.page || 1); // Get the page number from the query parameters
    const perPage = parseInt(req.query.limit || 5);
    page = page + 1;
    const offset = (page - 1) * perPage;
    const orderQuery = `SELECT
        orders.id AS order_id,
        orders.order_status AS order_status,
        orders.orderType AS orderType,
        orders.discount_amount AS discount_amount,
        orders.discount_type AS discount_type,
        total_amount,
        GST_amount,
        customers.name AS customer_name,
        customers.id AS customer_id,
        suppliers.name AS supplier_name,
        suppliers.id AS supplier_id,
        orders.created_at AS created_at,
        orders.updated_at AS updated_at,
        (
          SELECT COUNT(*)
          FROM order_in_invoices oii
          WHERE oii.order_id = orders.id
      ) > 0 AS invoiceExist,
      (
        SELECT oii.invoice_id
        FROM order_in_invoices oii
        WHERE oii.order_id = orders.id
        LIMIT 1
    ) AS invoice_id, -- Include invoice_id when it exists
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'product_id', product_id,
            'product_quantity', product_quantity,
            'created_at', product_in_order.created_at,
            'updated_at', product_in_order.updated_at
          )
        ) AS products
      FROM
        orders
      LEFT JOIN
        product_in_order
      ON
        orders.id = product_in_order.order_id
        LEFT JOIN
        customers
      ON
        orders.customer_id = customers.id
        LEFT JOIN
        suppliers
      ON
        orders.supplier_id = suppliers.id
        WHERE
        orders.supplier_id IS NOT NULL
      GROUP BY
        orders.id,customers.name,customers.id,suppliers.id,suppliers.name, customer_id, supplier_id, total_amount, GST_amount, orders.created_at, orders.updated_at
      ORDER BY
        orders.created_at DESC
      LIMIT $1 OFFSET $2;
      
      `;
    const { rows } = await pool.query(orderQuery, [perPage, offset]);
    // Calculate the total number of forums (without pagination)
    const totalOrdersQuery = `SELECT COUNT(*) AS total FROM public.orders WHERE supplier_id IS NOT NULL`;
    const totalOrderResult = await pool.query(totalOrdersQuery);
    const totalOrder = totalOrderResult.rows[0].total;
    const totalPages = Math.ceil(totalOrder / perPage);
    res
      .status(200)
      .json({ statusCode: 200, totalOrder, totalPages, AllOrders: rows });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
export const getAllUnPaidOrder = async (req, res) => {
  try {
    const { orderType, customer_id, supplier_id } = req.body;
    console.log(req.body);
    if (orderType === "customer") {
      const orderQuery=`
      SELECT
      o.id AS order_id,
      o.orderType AS order_type,
      o.total_amount,
      o.GST_amount,
      o.sub_total,
      o.discount_type,
      o.discount_amount,
      o.created_at AS order_created_at,
      o.updated_at AS order_updated_at,
      COALESCE(product_counts.product_count, 0) AS product_count,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'product_id', pio.product_id,
          'product_quantity', pio.product_quantity,
          'product_name', p.name,  -- Add more product details here
          'product_cost_price', p.cost_price,
          'product_sell_price', p.sell_price
        )
      ) AS products
    FROM
      orders AS o
    LEFT JOIN (
      SELECT
        order_id,
        COUNT(*) AS product_count
      FROM
        product_in_order
      GROUP BY
        order_id
    ) AS product_counts
    ON
      o.id = product_counts.order_id
    LEFT JOIN product_in_order AS pio
    ON
      o.id = pio.order_id
    LEFT JOIN products AS p
    ON
      pio.product_id = p.id
    WHERE
      o.orderType = 'customer'
      AND o.customer_id = $1
      AND o.order_status != 'cancel'
      AND NOT EXISTS (
        SELECT 1
        FROM order_in_invoices AS oii
        WHERE o.id = oii.order_id
      )
    GROUP BY
      o.id, product_counts.product_count;`
      const { rows } = await pool.query(orderQuery, [customer_id]);

      res.status(200).json({ statusCode: 200, AllOrders: rows });
    } else {

      const orderQuery=`
      SELECT
      o.id AS order_id,
      o.orderType AS order_type,
      o.total_amount,
      o.GST_amount,
      o.sub_total,
      o.discount_type,
      o.discount_amount,
      o.created_at AS order_created_at,
      o.updated_at AS order_updated_at,
      COALESCE(product_counts.product_count, 0) AS product_count,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'product_id', pio.product_id,
          'product_quantity', pio.product_quantity,
          'product_name', p.name,  -- Add more product details here
          'product_cost_price', p.cost_price,
          'product_sell_price', p.sell_price
        )
      ) AS products
    FROM
      orders AS o
    LEFT JOIN (
      SELECT
        order_id,
        COUNT(*) AS product_count
      FROM
        product_in_order
      GROUP BY
        order_id
    ) AS product_counts
    ON
      o.id = product_counts.order_id
    LEFT JOIN product_in_order AS pio
    ON
      o.id = pio.order_id
    LEFT JOIN products AS p
    ON
      pio.product_id = p.id
    WHERE
      o.orderType = 'supplier'
      AND o.supplier_id = $1
      AND o.order_status != 'cancel'
      AND NOT EXISTS (
        SELECT 1
        FROM order_in_invoices AS oii
        WHERE o.id = oii.order_id
      )
    GROUP BY
      o.id, product_counts.product_count;`
     
const { rows } = await pool.query(orderQuery, [supplier_id]);

      res.status(200).json({ statusCode: 200, AllOrders: rows });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};
