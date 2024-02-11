import { Router } from 'express';
import { upload } from '../utils/ImageHandler.js';
import { create, deleteProduct, getAllProducts, getRecentProducts, getSpecificProducts, getSpecificProductsStats, searchProduct, updateProduct } from '../Controllers/productController.js';

const productRoute = Router();

productRoute.post('/createProduct',upload("productsImages").array("image"), create);
productRoute.delete('/deleteProducts/:id', deleteProduct);
productRoute.get('/getAllProducts', getAllProducts);
productRoute.get('/getRecentProducts', getRecentProducts);
productRoute.get('/getSpecificProduct/:id', getSpecificProducts);
productRoute.get('/getSpecificProductStats/:id', getSpecificProductsStats);
productRoute.get('/serachProduct', searchProduct);
productRoute.put('/updateProducts',upload("productsImages").array("image"), updateProduct);
export default productRoute;
