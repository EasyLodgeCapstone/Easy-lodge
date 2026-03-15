const bcryptjs = require("bcryptjs");

const hashPassword = async (password) => {
    return bcryptjs.hash(password, 10);
};

const comparePassword = async (password, hashed) => {
    return bcryptjs.compare(password, hashed);
};

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = {
    hashPassword,
    comparePassword,
    generateOtp
};
