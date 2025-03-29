const { verifyToken } = require("./index.js")
const authenticate = (req, res, next) => {
    const token = req.headers['authorization']; // Get token from header
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    console.log("this is token")
    const purified_token = token.split(" ")[1];
    const decoded = verifyToken(purified_token);
    if (!decoded) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    req.user = decoded; // Attach user data to the request object
    next(); // Proceed to the next middleware/route
};

exports.authenticate = authenticate;