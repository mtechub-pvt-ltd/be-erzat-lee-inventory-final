import { Router } from 'express';
import { cancelOrder, create, deleteOrder, getAllOrder, getAllOrderByCustomer, getAllOrderBySupplier, getAllUnPaidOrder, getSpecificOrder, searchOrder, searchOrderBySupplier, updateOrder } from '../Controllers/orderController.js';

const orderRoute = Router();

orderRoute.post('/createOrder', create);
orderRoute.delete('/deleteOrder/:order_id', deleteOrder);
orderRoute.post('/cancelOrder', cancelOrder);
orderRoute.put('/updateOrder', updateOrder);
orderRoute.get("/getAllOrders",getAllOrder)
orderRoute.get("/getAllOrdersByCustomer",getAllOrderByCustomer)
orderRoute.get("/getAllOrdersBySupplier",getAllOrderBySupplier)
// orderRoute.get("/getAllSuppliersWithoutPagination",getAllSupplierswithoutPagination)
orderRoute.get("/getSpecificOrder/:order_id",getSpecificOrder)
orderRoute.get("/searchOrderByCustomer",searchOrder)
orderRoute.get("/searchOrderBySupplier",searchOrderBySupplier)
orderRoute.post("/getAllUnpaidOrder",getAllUnPaidOrder)
export default orderRoute;
