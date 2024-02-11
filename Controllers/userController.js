import { getSingleRow, insertRow } from "../queries/common.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.config/index.js";
import { forgetPasswordTemplate } from "../utils/EmailTemplates.js";
import { emailSent } from "../utils/EmailSent.js";
import { handle_delete_photos_from_folder } from "../utils/handleDeletePhoto.js";
export const  verifyToken = (req, res, next) => {
  const token = req.headers.authorization; // Assuming the token is in the 'Authorization' header
  if (!token && !token.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const authToken = token.slice(7);
  jwt.verify(authToken, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    // Token is valid, you can optionally include the decoded user information in the request
    req.user = decoded;
    // Return a 200 OK response when the token is valid
    return res.status(200).json({ message: 'Token is valid' });
  });
};
export const login = async (req, res) => {
    const { email, password,role } = req.body;
    try {
      const query=`SELECT * FROM users WHERE email=$1 AND role=$2`
      const  {rows}  =await pool.query(query,[email,role]);
      if (
        rows.length === 0 ||
        !(await bcrypt.compare(password, rows[0].password)) || rows[0].role!==role
      ) {
        return res
          .status(401)
          .json({ statusCode: 401, message: "Invalid registered email or password" });
      }

      const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET_KEY, {
        expiresIn: "7d",
      });
  
      const getcompanyLogo = 'SELECT * FROM company_logo ';
    
      const logo = await pool.query(getcompanyLogo);
      const imageData=logo.rows[0]
      res.status(200).json({ statusCode: 200, user: {
        id:rows[0].id,
        token,
        username:rows[0].username,
        email:rows[0].email,
        image:rows[0].image,
        logo:imageData?.image,
        created_at:rows[0].created_at,
        updated_at:rows[0].updated_at,
      } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ statusCode: 500, message: "Internal server error" });
    }
  };
  export const register = async (req, res) => {
 
    try {
      const { email, password, confirmPassword,role } = req.body;
      if (password !== confirmPassword) {
        return res.status(401).json({
          statusCode: 401,
          message: "Password and ConfirmPassword not matched",
        });
      }
      await pool.query('BEGIN'); // Start a transaction
      
      const existingUserResult = await getSingleRow("users",{column:"email",value:email});
  
      if (existingUserResult.length > 0) {
        await pool.query('ROLLBACK'); // Roll back the transaction
        return res
          .status(401)
          .json({ statusCode: 401, message: "Email is already in use" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const insertUserQuery =
        "INSERT INTO users (email, password,role) VALUES ($1, $2,$3) RETURNING *";
      const newUserResult = await pool.query(insertUserQuery, [
        email,
        hashedPassword,
        role
      ]);
      const userId = newUserResult.rows[0].id;
      await pool.query('COMMIT'); // Commit the transaction
      const token = jwt.sign({ userId }, process.env.JWT_SECRET_KEY, {
        expiresIn: "7d",
      });
  
      res
        .status(201)
        .json({ statusCode: 200, newUser: { 
          id:userId,
          token,
          role:newUserResult.rows[0].role,
          username:newUserResult.rows[0].username,
          email:newUserResult.rows[0].email,
          created_at:newUserResult.rows[0].created_at,
          updated_at:newUserResult.rows[0].updated_at, } });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error(error);
      res.status(500).json({ statusCode: 500, message: "Internal server error",error:error.stack });
    }finally {
      await pool.query('END'); // End the transaction
    }
  };
  export const forgetPassword = async (req, res, next) => {
    try {
      const { email } = req.body;
      const userEmailExistQuery = "SELECT * FROM users WHERE email=$1";
      const userEmailExistResult = await pool.query(userEmailExistQuery, [email]);
      if (userEmailExistResult.rows.length === 0) {
        return res
          .status(401)
          .json({ statusCode: 401, message: "Unregistered email" });
      }
      const otpCode = Math.floor(1000 + Math.random() * 9000);
      const updateQuery = "UPDATE users SET code =$1 WHERE email=$2";
      const updateQueryResult = await pool.query(updateQuery, [otpCode, email]);
      if (updateQueryResult.rowCount === 1) {
        const output = forgetPasswordTemplate(otpCode)
        await emailSent(email, output, "Verification Code");
        res.status(200).json({
          statusCode: 200,
          message: "Reset password code sent successfully!",
        });
      } else {
        res.status(400).json({
          statusCode: 400,
          message: "Reset passord code not sent",
        });
      }
    } catch (error) {
      res.status(500).json({
        statusCode: 500,
        error: error.stack,
        message: "Server error",
      });
    }
  };
  export const verifyOtp = async (req, res, next) => {
    try {
      const { code, email } = req.body;
      const veritOtpQuery =
        "UPDATE users SET code=$1 WHERE email=$2 AND code=$3 RETURNING *";
      const VerifyResult = await pool.query(veritOtpQuery, [null, email, code]);
      if (VerifyResult.rowCount === 1) {
        const token = jwt.sign(
          { email, id: VerifyResult.rows[0].id },
          process.env.JWT_SECRET_KEY + VerifyResult.rows[0].password,
          { expiresIn: "60m" }
        );
        return res.status(200).json({
          statusCode: 200,
          message: "Otp Code verify successfully",
          userId: VerifyResult.rows[0].id,
          token: token,
        });
      }
      return res
        .status(401)
        .json({ statusCode: 401, message: "Invalid Otp Code" });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return res.status(500).json({
        statusCode: 500,
        error: error.stack,
        message: "Server error",
      });
    }
  };
  export const ResetPasswordLinkValidate = async (req, res, next) => {
    const { id, token } = req.body;
    const userQuery = `SELECT * FROM users WHERE id=$1`;
    const userResult = await pool.query(userQuery, [id]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ statusCode: 400, message: "Invalid Link" });
    }
  
    const secret = process.env.JWT_SECRET_KEY + userResult.rows[0].password;
  
    try {
      const payload = jwt.verify(token, secret);
  
      if (!payload) {
        return res.status(401).json({ statusCode: 401, message: "Link Expire" });
      }
  
      return res.status(200).json({ status: 200, message: "Valid Link" });
    } catch (error) {
      return res
        .status(500)
        .json({ status: 500, error, message: "Server error" });
    }
  };
  export const resetPassword = async (req, res, next) => {
    try {
      const { password, confirmPassword, role, id, token } = req.body;
      console.log(req.body);
      if (password !== confirmPassword) {
        return res.status(401).json({
          statusCode: 401,
          message: "Password and confirm password not matched",
        });
      }
      const userEmailExistQuery = "SELECT * FROM users WHERE   role=$1 AND id=$2";
      const userEmailExistResult = await pool.query(userEmailExistQuery, [
        role,
        id,
      ]);
      if (userEmailExistResult.rows.length === 0) {
        return res
          .status(401)
          .json({ statusCode: 401, message: "User not exist" });
      }
      const secret =
        process.env.JWT_SECRET_KEY + userEmailExistResult.rows[0].password;
      const payload = jwt.verify(token, secret);
      if (!payload) {
        return res.status(401).json({ status: 401, message: "Link Expired" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const updateQuery = "UPDATE users SET password=$1 WHERE id=$2";
      const updateResult = await pool.query(updateQuery, [hashedPassword, id]);
      if (updateResult.rowCount === 1) {
        return res
          .status(200)
          .json({ statusCode: 200, message: "Password reset successfully" });
      }
  
      return res
        .status(401)
        .json({ statusCode: 401, message: "Password not updated" });
    } catch (error) {
      console.error("Error resetting password:", error);
      return res.status(500).json({
        statusCode: 500,
        error: error.stack,
        message: "Server error",
      });
    }
  };
  export const SingleUser = async (req, res, next) => {
    try {
      const { id } = req.params;
      const condition = { column: "id", value: id };
      const user = await getSingleRow("users", condition);
      if (user.length === 0) {
        return res
          .status(401)
          .json({ statusCode: 401, message: "User Not found" });
      }
      const {username,email,role}=user[0]
      res.status(200).json({ statusCode: 200, user:{
        id,
        username,
        email,
        role
      } });
    } catch (error) {
      console.error("Error resetting password:", error);
      return res.status(500).json({
        statusCode: 500,
        error: error.stack,
        message: "Server error",
      });
    }
  };
  export const changePassword = async (req, res) => {
    const { id, currentPassword, newPassword, role } = req.body;
    try {
      const userEmailExistQuery = "SELECT * FROM users WHERE id=$1";
      const { rows } = await pool.query(userEmailExistQuery, [id]);
      if (rows.length === 0) {
        return res
          .status(401)
          .json({ statusCode: 401, message: "User not found" });
      }
      if (
        !(await bcrypt.compare(currentPassword, rows[0].password)) ||
        rows[0].role !== role
      ) {
        return res
          .status(401)
          .json({ statusCode: 401, message: "Current password invalid" });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updateQuery = `UPDATE users SET password=$1 WHERE id=$2`;
      const updateResult = await pool.query(updateQuery, [hashedPassword, id]);
      if (updateResult.rowCount === 0) {
        return res
          .status(401)
          .json({ statusCode: 400, message: "Operation not successfull" });
      }
  
      res
        .status(200)
        .json({ statusCode: 200, message: "Password changed successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ statusCode: 500, message: "Internal server error" });
    }
  };
  export const updateProfile = async (req, res) => {
    try {
      const { username,id } = req.body;
     
      const condition={
        column:'id',
        value:id
      }
      const singleRow=await getSingleRow('users',condition)
      if(!singleRow.length){
        return res.status(404).json({statusCode:404,message:"User does not exist.Please login again!"})
      }
   
     
     const updateQuery=`UPDATE users SET username=$1,"updated_at" = NOW() WHERE id=$2 RETURNING *`
     const result=await pool.query(updateQuery,[username,id])
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "User profile not updated" });
      }
      
       res
        .status(200)
        .json({ statusCode:200,message: "User profile updated successfully", updatedUser:{
          id:result.rows[0].id,
          username:result.rows[0].username,
          email:result.rows[0].email,
          created_at:result.rows[0].created_at,
          updated_at:result.rows[0].updated_at,} });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
  export const getDashboardStats = async (req, res) => {
    try {

  const statsQuery=`
  WITH table_counts AS (
    SELECT 'customers' AS table_name, COUNT(*) AS row_count FROM customers
    UNION ALL
    SELECT 'suppliers' AS table_name, COUNT(*) AS row_count FROM suppliers
    UNION ALL
    SELECT 'invoices' AS table_name, COUNT(*) AS row_count FROM invoices
    UNION ALL
    SELECT 'orders' AS table_name, COUNT(*) AS row_count FROM orders
)
SELECT json_object_agg(table_name, row_count) AS result
FROM table_counts;
`
      const { rows } = await pool.query(statsQuery);
      
  
        return res.status(200).json({ statusCode: 200, stats: rows[0].result });
     } catch(error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
  export const createCompanyDetails = async (req, res) => {
    try {
      const {
        company_name,
        company_email,
        reg_no,
        company_address,
        company_tel_no,
        company_fax_no,
        company_website,
        terms,
        gst,
        account_name,
        bank_name,
        bank_account,
        paynow_uen,
        bill_to_name,
        bill_to_address,
        bill_to_city,
        bill_to_country,
        ship_to_name,
        ship_to_address,
        ship_to_city,
        ship_to_country
      } = req.body;
  
      const createCompanyQuery = `
        INSERT INTO company_data (
          company_name,
          company_email,
          reg_no,
          company_address,
          company_tel_no,
          company_fax_no,
          company_website,
          terms,
          account_name,
          bank_name,
          bank_account,
          paynow_uen,
          bill_to_name,
          bill_to_address,
          bill_to_city,
          bill_to_country,
          ship_to_name,
          ship_to_address,
          ship_to_city,
          ship_to_country,gst_amount        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,$21)
        RETURNING *;
      `;
  
      const values = [
        company_name,
        company_email,
        reg_no,
        company_address,
        company_tel_no,
        company_fax_no,
        company_website,
        terms,
        account_name,
        bank_name,
        bank_account,
        paynow_uen,
        bill_to_name,
        bill_to_address,
        bill_to_city,
        bill_to_country,
        ship_to_name,
        ship_to_address,
        ship_to_city,
        ship_to_country,
        gst
      ];
  
      const result = await pool.query(createCompanyQuery, values);
      const newCompany = result.rows[0];
  
      res.status(201).json({ message: 'Company created successfully', company: newCompany });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error creating company' });
    }
  };
  export const changeImage = async (req, res) => {
    try {
      console.log(req.file.filename);
     const image=req.file.filename
     const logo=`/company_logo/${image}`
     const {companyId}=req.body
     const condition = { column: "company_id", value: companyId };
     const user = await getSingleRow("company_logo", condition);
     if (user.length === 0) {
      const createCompanyQuery = `
      INSERT INTO company_logo (
        company_id,
        image
       
      )
      VALUES ($1,$2)
      RETURNING *;
    `;

    const values = [
      companyId,
      logo
    ];

    const result = await pool.query(createCompanyQuery, values);
    const newCompany = result.rows[0];

    res.status(201).json({ message: 'Company logo created successfully', company: newCompany });
     }else{
      const imageFilenames= user[0].image.replace("/company_logo/", "")
      handle_delete_photos_from_folder([imageFilenames], "productsImages");
      const updateCompanyLogo = `
      UPDATE  company_logo SET image=$1 WHERE company_id=$2 
      RETURNING *;
    `;

    const result = await pool.query(updateCompanyLogo,[ logo,companyId]);
    const newCompany = result.rows[0];

    res.status(201).json({ message: 'Company logo updated successfully', company: newCompany });
     }
    
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error creating company' });
    }
  };
  
  
  export const getCompanyDetails = async (req, res) => {
    try {
     
      const getAllCompaniesQuery = 'SELECT company_data.*,company_logo.image FROM company_data LEFT JOIN company_logo ON company_data.id=company_logo.company_id';
    
      const { rows } = await pool.query(getAllCompaniesQuery);
      res
        .status(200)
        .json({ statusCode: 200, data: rows[0] });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ statusCode: 500, message: "Internal server error", error });
    }
  };
  export const updateCompanyDetails = async (req, res) => {
    try {
      const {
        companyId,
        company_name,
        company_email,
        reg_no,
        company_address,
        company_tel_no,
        company_fax_no,
        company_website,
        terms,
        gst,
        account_name,
        bank_name,
        bank_account,
        paynow_uen,
        bill_to_name,
        bill_to_address,
        bill_to_city,
        bill_to_country,
        ship_to_name,
        ship_to_address,
        ship_to_city,
        ship_to_country
      } = req.body;
  
      const updateCompanyQuery = `
        UPDATE company_data
        SET
          company_name = $1,
          company_email = $2,
          reg_no = $3,
          company_address = $4,
          company_tel_no = $5,
          company_fax_no = $6,
          company_website = $7,
          terms = $8,
          account_name = $9,
          bank_name = $10,
          bank_account = $11,
          paynow_uen = $12,
          bill_to_name = $13,
          bill_to_address = $14,
          bill_to_city = $15,
          bill_to_country = $16,
          ship_to_name = $17,
          ship_to_address = $18,
          ship_to_city = $19,
          ship_to_country = $20,
          gst_amount=$21
        WHERE id = $22
        RETURNING *;
      `;
  
      const values = [
        company_name,
        company_email,
        reg_no,
        company_address,
        company_tel_no,
        company_fax_no,
        company_website,
        terms,
        account_name,
        bank_name,
        bank_account,
        paynow_uen,
        bill_to_name,
        bill_to_address,
        bill_to_city,
        bill_to_country,
        ship_to_name,
        ship_to_address,
        ship_to_city,
        ship_to_country,
        gst,
        companyId
      ];
  
      const result = await pool.query(updateCompanyQuery, values);
      const updatedCompany = result.rows[0];
  
      if (!updatedCompany) {
        return res.status(404).json({ error: 'Company not found' });
      }
        const getLogo=await pool.query(`SELECT * FROM company_logo WHERE company_id=$1`,[companyId])
      res.status(200).json({ message: 'Company updated successfully', company: {...updatedCompany,
      logo:getLogo.rows[0].image
      } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error updating company' });
    }
  };
  
  export const getCompanyLogo = async (req, res) => {
    try {
     
      const getcompanyLogo = 'SELECT * FROM company_logo ';
    
      const { rows } = await pool.query(getcompanyLogo);
      console.log(rows);
      res
        .status(200)
        .json({ statusCode: 200, data: rows[0] });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ statusCode: 500, message: "Internal server error", error });
    }
  };