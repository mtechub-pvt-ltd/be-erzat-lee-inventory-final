import { Router } from 'express';
import { upload } from '../utils/ImageHandler.js';
import { ResetPasswordLinkValidate, SingleUser, changeImage, changePassword, createCompanyDetails, forgetPassword, getCompanyDetails, getCompanyLogo, getDashboardStats, login, register, resetPassword, updateCompanyDetails, updateProfile, verifyOtp, verifyToken } from '../Controllers/userController.js';
const userRoute = Router();
userRoute.get('/verifyToken', verifyToken);
userRoute.post('/login', login);
userRoute.post('/register', register);
userRoute.post("/forgetPassword",forgetPassword)
userRoute.post("/verifyOtp",verifyOtp)
userRoute.post("/reset_password",resetPassword)
userRoute.post("/validate_reset_password_link",ResetPasswordLinkValidate)
userRoute.get("/getUserById/:id",SingleUser)
userRoute.get("/getDashboardStats",getDashboardStats)
userRoute.post("/change_password",changePassword)
userRoute.put("/update_profile",updateProfile)
userRoute.get('/get_logo',getCompanyLogo)
userRoute.post("/change_image",upload("company_logo").single("image"),changeImage)
userRoute.post("/createCompanyData",createCompanyDetails)
userRoute.get("/getCompanyDetail",getCompanyDetails)
userRoute.put("/updateCompanyDetail",updateCompanyDetails)
export default userRoute;
