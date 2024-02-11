import { Router } from 'express';
import { countSupplier, create, deleteSupplier, getAllSuppliers, getAllSupplierswithoutPagination, getSpecificSuppliers, searchSupplier, searchSupplierOrder, updateSupplier } from '../Controllers/supplierController.js';

const supplierRoute = Router();

supplierRoute.post('/createSupplier', create);
supplierRoute.delete('/deleteSupplier/:id', deleteSupplier);
supplierRoute.put('/updateSupplier', updateSupplier);
supplierRoute.get("/getAllSuppliers",getAllSuppliers)
supplierRoute.get("/getAllSuppliersWithoutPagination",getAllSupplierswithoutPagination)
supplierRoute.get("/getSpecificSupplier/:id",getSpecificSuppliers)
supplierRoute.get("/searchSupplier",searchSupplier)
supplierRoute.get("/searchSupplierOrder",searchSupplierOrder)
supplierRoute.get("/countSupplier",countSupplier)
export default supplierRoute;
