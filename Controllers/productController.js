// import Amenities from "../model/amenitiesModel.js";
import pool from "../db.config/index.js";
import { getAllRows, getSingleRow } from "../queries/common.js";
import { handle_delete_photos_from_folder } from "../utils/handleDeletePhoto.js";
export const create = async (req, res) => {
  try {
    const { name, code, quantity, cost_price,sell_price } = req.body;
    if (req.files.length === 0) {
      return res.status(400).json({ message: "Image is required" });
    }
    const images = req.files.map((file) => `/productsImages/${file.filename}`);
    const createQuery =
      "INSERT INTO products (id,name, code,quantity,cost_price,sell_price) VALUES (DEFAULT,$1, $2, $3, $4,$5) RETURNING *";
    const result = await pool.query(createQuery, [
      name,
      code,
      quantity,
      cost_price,
      sell_price,
    ]);

    if (result.rowCount === 1) {
      for (const imageUrl of images) {
        const imageResult = await pool.query(
          "INSERT INTO product_images (product_id, image_url) VALUES ($1, $2)",
          [result.rows[0].id, imageUrl]
        );
        if (imageResult.rowCount === 0) {
          await pool.query("DELETE FROM products WHERE id=$1", [
            result.rows[0].id,
          ]);
          await pool.query("DELETE FROM product_images WHERE product_id=$1", [
            result.rows[0].id,
          ]);
        }
      }
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
export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const condition = {
      column: "id",
      value: id,
    };
    const oldImage = await getSingleRow("products", condition);
    if (oldImage.length === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "product not found " });
    }
  
    // // Fetch image URLs associated with the product
    // const imageUrlsQuery =
    //   "SELECT image_url FROM product_images WHERE product_id = $1";
    // const imageUrlsResult = await pool.query(imageUrlsQuery, [id]);
    // const imageUrls = imageUrlsResult.rows.map((row) => row.image_url);

    // // Extract filenames by removing the '/productsImages/' prefix
    // const imageFilenames = imageUrls.map((imageUrl) =>
    //   imageUrl.replace("/productsImages/", "")
    // );
    // // Delete images from the local folder
    // handle_delete_photos_from_folder(imageFilenames, "productsImages");
  
    //   // await pool.query(`DELETE FROM product_in_order WHERE product_id=$1`,[id])
    
    
    const delQuery = "UPDATE  products SET status=$1 WHERE id=$2"; //product images automatically deleted due to cascade
    const result = await pool.query(delQuery, ['trash',id]);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "Product not deleted" });
    }

    res
      .status(200)
      .json({ statusCode: 200, message: "Product deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ statusCode: 500, message: "Internal server error" });
  }
};
export const getAllProducts = async (req, res) => {
  try {

    
    let page = parseInt(req.query.page); // Get the page number from the query parameters
    let perPage=parseInt(req.query.limit);
    let offset=null
    if (typeof page !== 'undefined' && typeof perPage !== 'undefined') {
      page = page + 1;
      offset = (page - 1) * perPage;
    }
    let data=null;
    if(page && perPage){
      const product_Query = `SELECT
      p.id AS product_id,
      p.name AS product_name,
      p.code AS product_code,
      p.quantity AS product_quantity,
      p.cost_price AS product_cost_price,
      p.sell_price AS product_sell_price,
      p.created_at AS created_at,
      p.updated_at AS updated_at,
      ARRAY_AGG(pi.image_url) AS product_images
    FROM
      products p
    LEFT JOIN
      product_images pi ON p.id = pi.product_id
      WHERE p.status !='trash'
    GROUP BY
      p.id, p.name, p.code, p.quantity, p.cost_price,p.sell_price
    ORDER BY
      p.created_at DESC  
    LIMIT $1 OFFSET $2;
    `;
    data = await pool.query(product_Query, [perPage, offset]);
    }else{
      const product_Query = `SELECT
      p.id AS product_id,
      p.name AS product_name,
      p.code AS product_code,
      p.quantity AS product_quantity,
      p.cost_price AS product_cost_price,
      p.sell_price AS product_sell_price,
      p.created_at AS created_at,
      p.updated_at AS updated_at,
      ARRAY_AGG(pi.image_url) AS product_images
    FROM
      products p
    LEFT JOIN
      product_images pi ON p.id = pi.product_id
      WHERE p.status !='trash'
    GROUP BY
      p.id, p.name, p.code, p.quantity, p.cost_price,p.sell_price
    ORDER BY
      p.created_at DESC  
    `;
    data = await pool.query(product_Query,);
    }
   
   
    // Calculate the total number of forums (without pagination)
    const totalProductsQuery = `SELECT COUNT(*) AS total FROM public.products WHERE status != 'trash' `;
    const totalProductResult = await pool.query(totalProductsQuery);
    const totalProduct = totalProductResult.rows[0].total;
    const totalPages = Math.ceil(totalProduct / perPage);
    res
      .status(200)
      .json({ statusCode: 200, totalProduct, totalPages, AllProducts: data.rows });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ statusCode: 500, message: "Internal server error", error });
  }
};

export const getSpecificProducts = async (req, res) => {
  try {
    const { id } = req.params;
  //   -- COUNT(orders.id) AS total_orders
  //   --LEFT JOIN
  // --orders ON p.supplier_id = orders.supplier_id
  const product_Query=`
  SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.code AS product_code,
  p.quantity AS product_quantity,
  p.cost_price AS product_cost_price,
  p.sell_price AS product_sell_price,
  COALESCE(product_images.image_urls, ARRAY[]::text[]) AS product_images -- Use COALESCE to handle NULLs
FROM
  products p

LEFT JOIN (
  SELECT
    product_id,
    ARRAY_AGG(image_url) AS image_urls
  FROM
    product_images
  GROUP BY
    product_id
) AS product_images ON p.id = product_images.product_id
WHERE
  p.id = $1
GROUP BY
  p.id, p.name, p.code, p.quantity, p.cost_price,p.sell_price, product_images.image_urls
ORDER BY
  p.id;
`
    const { rows } = await pool.query(product_Query, [id]);
    if (rows.length) {
      return res.status(200).json({ statusCode: 200, Product: rows[0] });
    } else {
      res.status(404).json({ statusCode: 404, message: "No product found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getSpecificProductsStats = async (req, res) => {
  try {
    const { id } = req.params;
    
  const productQuery = `SELECT
  p.id AS product_id,
  p.name AS product_name,
  SUM(p.quantity) AS total_quantity_available,
  COUNT(po.order_id) AS times_sold,
  EXTRACT(MONTH FROM o.created_at) AS month,
  SUM(po.product_quantity * p.sell_price) AS income
FROM
  products p
LEFT JOIN
  product_in_order po ON p.id = po.product_id
LEFT JOIN
  orders o ON po.order_id = o.id
WHERE
  p.id =$1
GROUP BY
  p.id, p.name, month`;

    const { rows } = await pool.query(productQuery, [id]);
    if (rows.length) {
      // Create an object to store income data by month
      const incomeByMonth = {};

      // Initialize income data for all months to 0
      for (let month = 1; month <= 12; month++) {
        incomeByMonth[getMonthName(month)] = 0;
      }
     let times_sold=0;
     let total_income=0;
      // Process the result set to update income data
      for (const row of rows) {
        console.log(row);
        
        total_income+=!row.income?0:parseInt(row.income,10)
        times_sold=times_sold+parseInt(row.times_sold, 10)
        const month = getMonthName(row.month);
        incomeByMonth[month] = row.income;
      }

      // Create the final product object with income data
      const product = {
        product_id: id,
        product_name: rows[0].product_name,
        total_quantity_available: rows[0].total_quantity_available,
        times_sold,
        total_income,
        income: incomeByMonth,
      };

      return res.status(200).json({ statusCode: 200, Product: product });
    } else {
      return res.status(404).json({ statusCode: 404, message: "No product found" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to get month name from month number
function getMonthName(monthNumber) {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return monthNames[monthNumber - 1];
}

export const updateProduct = async (req, res) => {
  try {
    const { name, code, quantity, cost_price,sell_price, id, oldImages, supplier_id } =
      req.body;
      console.log(supplier_id);
      const oldImageArray = Array.isArray(oldImages) ? oldImages : [oldImages];
    const query = "SELECT * FROM products WHERE id=$1";
    const oldImage = await pool.query(query, [id]);
    if (oldImage.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    if (req.files && req.files.length) {
      console.log("file a gai ha ");
      //for new image preparation
      const newImages = req.files.map(
        (file) => `/productsImages/${file.filename}`
      );
      
      
        for (let index = 0; index < newImages.length; index++) {
          if (oldImageArray) {
            console.log("old image bi ha  ");
          const updateQuery = `UPDATE product_images SET image_url=$1 WHERE product_id=$2 AND image_url=$3`;

          const updateImageResult = await pool.query(updateQuery, [
            newImages[index],
            id,
            oldImageArray[index],
          ]);
          if (updateImageResult.rowCount === 0) {
            console.log("new add hoi ha ku kay wo old image say match ni kr rhi");
            const insertQuery = `INSERT INTO product_images (product_id, image_url) VALUES ($1, $2)`;

             await pool.query(insertQuery, [
              id,
              newImages[index],
            
            ]);
          }
        }
        else{
          console.log("old image ni ha  ");
          const insertQuery = `INSERT INTO product_images (product_id, image_url) VALUES ($1, $2)`;
  
               await pool.query(insertQuery, [
                
                id,
                newImages[index],
              ]);
        }
      }
       
      // if (updateImageResult.rowCount === 0) {
      //   return res.status(400).json({ message: "Product image not updated " });
      // }
      // for (const image of newImages) {

      //   const updateQuery=`UPDATE product_images SET image_url=$1 WHERE product_id=$2`
      //   const updateImageResult=await pool.query(updateQuery,[image,id])
      //   if(updateImageResult.rowCount===0){
      //     return res.status(400).json({message:"Product image not updated "})
      //   }
      // }
    }else if(oldImages){
      if(oldImageArray.length>0){
      for (const oldImageUrl of oldImageArray) {
        const deleteOldImagesQuery = `
          DELETE FROM product_images
          WHERE product_id = $1
          AND image_url = $2
        `;
        
       await pool.query(deleteOldImagesQuery, [id, oldImageUrl]);
         //for deleting image in local folder
         const oldImageFilenames = oldImageArray?.map((imageUrl) =>
         imageUrl.replace("/productsImages/", "")
       );
       handle_delete_photos_from_folder(oldImageFilenames, "productsImages");
        // Check result or handle errors if needed
      }
    }
    }
//    // Ensure supplier_id is a valid integer or set it to null if it's not
// const supplierIdToUse = Number.isInteger(supplier_id) ? supplier_id : null;

    const updateProduct = `UPDATE products SET name=$1,code=$2,quantity=$3,cost_price=$4,sell_price=$5, "updated_at"=NOW() WHERE id=$6 RETURNING *`;
    const result = await pool.query(updateProduct, [
      name,
      code,
      quantity,
      cost_price,
      sell_price,
      id,
    ]);
    if (result.rowCount === 1) {
      return res.status(200).json({ statusCode: 200, Product: result.rows[0] });
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
export const searchProduct = async (req, res) => {
  try {
    const { name } = req.query;

    // Split the search query into individual words
    const searchWords = name.split(/\s+/).filter(Boolean);

    if (searchWords.length === 0) {
      return res.status(200).json({ statusCode: 200, Suppliers: [] });
    }

    // Create an array of conditions for each search word
    const conditions = searchWords.map((word) => {
      return `(name ILIKE '%${word}%' OR code ILIKE '%${word}%')`; 
    });
    const query = `SELECT
      p.id AS product_id,
      p.name AS product_name,
      p.code AS product_code,
      p.quantity AS product_quantity,
      p.cost_price AS product_cost_price,
      p.sell_price AS product_sell_price,
      ARRAY_AGG(pi.image_url) AS product_images
    FROM
      products p
    LEFT JOIN
      product_images pi ON p.id = pi.product_id
      WHERE ${conditions.join(" OR ")}
    GROUP BY
      p.id, p.name, p.code, p.quantity, p.cost_price,p.sell_price
    ORDER BY
      p.created_at DESC
     
    `;


    const { rows } = await pool.query(query);

    // if (rows.length > 0) {
    return res
      .status(200)
      .json({ statusCode: 200, totalResults: rows.length, Products: rows });
    // }
    // else {
    //   res.status(404).json({ statusCode: 404, message: "No Product found" });
    // }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getRecentProducts = async (req, res) => {
  try {
    const limit = 5; // Number of recent products to fetch

    const productQuery = `
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.code AS product_code,
        p.quantity AS product_quantity,
        p.cost_price AS product_cost_price,
        p.sell_price AS product_sell_price,
        p.created_at AS created_at,
        p.updated_at AS updated_at,
        ARRAY_AGG(pi.image_url) AS product_images
      FROM
        products p
      LEFT JOIN
        product_images pi ON p.id = pi.product_id
      GROUP BY
        p.id, p.name, p.code, p.quantity, p.cost_price, p.sell_price
      ORDER BY
        p.created_at DESC
      LIMIT $1;
    `;

    const data = await pool.query(productQuery, [limit]);

    res.status(200).json({
      statusCode: 200,
      recentProducts: data.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      statusCode: 500,
      message: "Internal server error",
      error,
    });
  }
};

