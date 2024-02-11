import { Router } from 'express';
import { create, deleteInvoice, getAllInvoices, getEStatement, getSpecificInvoices, serchInvoices, updateInvoices, updateInvoicesStatus } from '../Controllers/invoiceController.js';

const invoiceRoute = Router();

invoiceRoute.post('/createInvoice', create);
invoiceRoute.delete('/deleteInvoice/:invoice_id', deleteInvoice);
invoiceRoute.get('/getAllInvoices/:orderType', getAllInvoices);
invoiceRoute.get('/getSpecificInvoice/:invoice_id', getSpecificInvoices);
// invoiceRoute.get('/getSpecificProductStats/:id', getSpecificProductsStats);
invoiceRoute.get('/serchInvoices/:orderType', serchInvoices);
invoiceRoute.put('/updateInvoices', updateInvoices);
invoiceRoute.put('/updateInvoiceStatus', updateInvoicesStatus);
invoiceRoute.post('/getEStatement', getEStatement);
export default invoiceRoute;
