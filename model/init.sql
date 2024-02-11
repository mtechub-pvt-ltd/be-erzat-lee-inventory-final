-- CREATE SEQUENCE IF NOT EXISTS public.invoice_id_seq;

CREATE SEQUENCE IF NOT EXISTS users_sequence START 300000 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS customers_sequence START 300000 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS suppliers_sequence START 300000 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS products_sequence START 300000 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS orders_sequence START 300000 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS product_images_sequence START 300000 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS product_in_order_sequence START 300000 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS invoices_sequence START 300000 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS order_in_invoices_sequence START 300000 INCREMENT 1;

-- CREATE SEQUENCE IF NOT EXISTS my_sequence START 300000 INCREMENT 1;
CREATE TABLE IF NOT EXISTS public.users (
    id INT NOT NULL DEFAULT nextval('users_sequence') PRIMARY KEY,
    username VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    code VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.customers (
     id INT NOT NULL DEFAULT nextval('customers_sequence') PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    contact_no VARCHAR(255) NOT NULL,
    person_in_charge VARCHAR(255) NOT NULL,
    bill_to_name VARCHAR(255) NOT NULL,
    bill_to_address VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.suppliers (
     id INT NOT NULL DEFAULT nextval('suppliers_sequence') PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.products (
    id INT NOT NULL DEFAULT nextval('products_sequence') PRIMARY KEY,
    --  supplier_id INT REFERENCES suppliers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code TEXT  NOT NULL,
    quantity INT NOT NULL,
    cost_price BIGINT NOT NULL,
    sell_price BIGINT NOT NULL,
    status VARCHAR(255) DEFAULT 'notTrash',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.orders (
   id INT NOT NULL DEFAULT nextval('orders_sequence') PRIMARY KEY,
  customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
  supplier_id INT REFERENCES suppliers(id) ON DELETE CASCADE,
  orderType TEXT,
  sub_total BIGINT NOT NULL,
  order_status TEXT DEFAULT 'success' ,
  total_amount numeric NOT NULL,
  GST_amount numeric NOT NULL,
  discount_type TEXT NOT NULL,
  discount_amount numeric NOT NULL,
  client_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS public.product_images (
    id INT NOT NULL DEFAULT nextval('product_images_sequence') PRIMARY KEY,
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.product_in_order (
   id INT NOT NULL DEFAULT nextval('product_in_order_sequence') PRIMARY KEY,
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  product_quantity integer NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);





CREATE TABLE IF NOT EXISTS public.invoices (
    -- id VARCHAR(20) PRIMARY KEY,
     id INT NOT NULL DEFAULT nextval('invoices_sequence') PRIMARY KEY,
     receipt_no BIGINT ,
    bill_to_address JSON NOT NULL,
    ship_to_address JSON NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'Unpaid',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.order_in_invoices (
     id INT NOT NULL DEFAULT nextval('order_in_invoices_sequence') PRIMARY KEY,
     invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS public.company_data (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_email VARCHAR(255) NOT NULL,
    reg_no VARCHAR(255) NOT NULL,
    company_address VARCHAR(255) NOT NULL,
    company_tel_no VARCHAR(255) NOT NULL,
    company_fax_no VARCHAR(255) NOT NULL,
    company_website VARCHAR(255),
    terms TEXT,
    gst_amount NUMERIC NOT NULL,
    account_name VARCHAR(255), -- New column for account_name
    bank_name VARCHAR(255), -- New column for bank_name
    bank_account VARCHAR(255), -- New column for bank_account
    paynow_uen VARCHAR(255), 
     bill_to_name VARCHAR(255) NOT NULL,
    bill_to_address VARCHAR(255) NOT NULL,
    bill_to_city VARCHAR(255) ,
    bill_to_country VARCHAR(255) ,
    ship_to_name VARCHAR(255) ,
    ship_to_address VARCHAR(255) ,
    ship_to_city VARCHAR(255) ,
    ship_to_country VARCHAR(255) ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.company_logo(
    company_id INT REFERENCES company_data (id) ON DELETE CASCADE,
    image VARCHAR(255) NOT NULL
);