import jwt from "jsonwebtoken";
export const verification = async function (req, res, next) {
    const token = req.headers.authorization; // Assuming the token is in the 'Authorization' header
    if (!token && !token.startsWith("Bearer ")) {
      return res.status(401).json({statusCode:401, message: "Unauthorized" });
    }
    const authToken = token.slice(7);
    jwt.verify(authToken, process.env.SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).json({statusCode:401, message: "Token is not valid" });
      }
  
      // Token is valid, you can optionally include the decoded user information in the request
      req.user = decoded;
      // Return a 200 OK response when the token is valid
    //   return res.status(200).json({ message: "Token is valid" });
    next();
    });
  };