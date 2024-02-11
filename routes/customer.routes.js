import { Router } from 'express';
import { countCustomer, create, deleteCustomer, getAllCustomers, getAllCustomerswithoutPagination, getSpecificCustomer, searchCustomer, updateCustomer } from '../Controllers/customerController.js';
// import { countSupplier, create, deleteSupplier, getAllSuppliers, getSpecificSuppliers, searchSupplier, updateSupplier } from '../Controllers/supplierController.js';

const customerRoute = Router();

customerRoute.post('/createCustomer', create);
customerRoute.delete('/deleteCustomer/:id', deleteCustomer);
customerRoute.put('/updateCustomer', updateCustomer);
customerRoute.get("/getAllCustomers",getAllCustomers)
customerRoute.get("/getAllCustomersWithoutPagination",getAllCustomerswithoutPagination)
customerRoute.get("/getSpecificCustomer/:id",getSpecificCustomer)
customerRoute.get("/searchCustomer",searchCustomer)
customerRoute.get("/countCustomer",countCustomer)
export default customerRoute;
