const { validationResult } = require('express-validator');

module.exports = validateRequest;

function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty())
        return res.status(400).json({ message: errors.array()[0].msg });
    next();
}
