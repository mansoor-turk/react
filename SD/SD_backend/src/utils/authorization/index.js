const jwt = require('jsonwebtoken');
// Generate a JWT token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '8h' }); // 6-hour expiry
};

// Verify a JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null; // Token is invalid or expired
    }
};



exports.generateToken = generateToken;
exports.verifyToken = verifyToken;