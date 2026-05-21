const jwt = require('jsonwebtoken');
const db = require('../_helpers/db');

module.exports = authorize;

function authorize(roles = []) {
    if (typeof roles === 'string') roles = [roles];

    return [
        async (req, res, next) => {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) return res.status(401).json({ message: 'Unauthorized' });

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const account = await db.Account.findByPk(decoded.id);
                if (!account) return res.status(401).json({ message: 'Unauthorized' });

                if (roles.length && !roles.includes(account.role))
                    return res.status(401).json({ message: 'Unauthorized' });

                req.auth = { id: account.id, role: account.role };
                req.account = account;
                next();
            } catch {
                return res.status(401).json({ message: 'Unauthorized' });
            }
        }
    ];
}
