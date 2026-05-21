const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authorize = require('../_middleware/authorize');
const validateRequest = require('../_middleware/validate-request');
const accountService = require('./account.service');

// routes
router.post('/authenticate', authenticateSchema, authenticate);
router.post('/refresh-token', refreshToken);
router.post('/revoke-token', authorize(), revokeToken);
router.post('/register', registerSchema, register);
router.post('/verify-email', verifyEmailSchema, verifyEmail);
router.post('/forgot-password', forgotPasswordSchema, forgotPassword);
router.post('/validate-reset-token', validateResetTokenSchema, validateResetToken);
router.post('/reset-password', resetPasswordSchema, resetPassword);
router.get('/', authorize('Admin'), getAll);
router.post('/', authorize('Admin'), createSchema, create);
router.get('/:id', authorize(), getById);
router.put('/:id', authorize(), updateSchema, update);
router.delete('/:id', authorize(), _delete);

module.exports = router;

// schema validators

function authenticateSchema(req, res, next) {
    const rules = [
        body('email').notEmpty().withMessage('Email is required'),
        body('password').notEmpty().withMessage('Password is required')
    ];
    validateSchema(rules)(req, res, next);
}

function registerSchema(req, res, next) {
    const rules = [
        body('title').notEmpty().withMessage('Title is required'),
        body('firstName').notEmpty().withMessage('First name is required'),
        body('lastName').notEmpty().withMessage('Last name is required'),
        body('email').isEmail().withMessage('Email is invalid'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('confirmPassword').custom((val, { req }) => {
            if (val !== req.body.password) throw new Error('Passwords must match');
            return true;
        }),
        body('acceptTerms').isBoolean().withMessage('Accept terms is required').custom(val => {
            if (val !== true && val !== 'true') throw new Error('Accept terms is required');
            return true;
        })
    ];
    validateSchema(rules)(req, res, next);
}

function verifyEmailSchema(req, res, next) {
    const rules = [body('token').notEmpty().withMessage('Token is required')];
    validateSchema(rules)(req, res, next);
}

function forgotPasswordSchema(req, res, next) {
    const rules = [body('email').isEmail().withMessage('Email is invalid')];
    validateSchema(rules)(req, res, next);
}

function validateResetTokenSchema(req, res, next) {
    const rules = [body('token').notEmpty().withMessage('Token is required')];
    validateSchema(rules)(req, res, next);
}

function resetPasswordSchema(req, res, next) {
    const rules = [
        body('token').notEmpty().withMessage('Token is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('confirmPassword').custom((val, { req }) => {
            if (val !== req.body.password) throw new Error('Passwords must match');
            return true;
        })
    ];
    validateSchema(rules)(req, res, next);
}

function createSchema(req, res, next) {
    const rules = [
        body('title').notEmpty().withMessage('Title is required'),
        body('firstName').notEmpty().withMessage('First name is required'),
        body('lastName').notEmpty().withMessage('Last name is required'),
        body('email').isEmail().withMessage('Email is invalid'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('confirmPassword').custom((val, { req }) => {
            if (val !== req.body.password) throw new Error('Passwords must match');
            return true;
        }),
        body('role').notEmpty().withMessage('Role is required')
    ];
    validateSchema(rules)(req, res, next);
}

function updateSchema(req, res, next) {
    const rules = [
        body('title').optional(),
        body('firstName').optional(),
        body('lastName').optional(),
        body('email').optional().isEmail().withMessage('Email is invalid'),
        body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('confirmPassword').optional().custom((val, { req }) => {
            if (req.body.password && val !== req.body.password)
                throw new Error('Passwords must match');
            return true;
        })
    ];
    validateSchema(rules)(req, res, next);
}

function validateSchema(rules) {
    return async (req, res, next) => {
        await Promise.all(rules.map(r => r.run(req)));
        validateRequest(req, res, next);
    };
}

// route handlers

async function authenticate(req, res, next) {
    try {
        const { email, password } = req.body;
        const ipAddress = req.ip;
        const accountData = await accountService.authenticate({ email, password, ipAddress });
        setTokenCookie(res, accountData.refreshToken);
        res.json(omit(accountData, 'refreshToken'));
    } catch (err) { next(err); }
}

async function refreshToken(req, res, next) {
    try {
        const token = req.cookies.refreshToken;
        const ipAddress = req.ip;
        const accountData = await accountService.refreshToken({ token, ipAddress });
        setTokenCookie(res, accountData.refreshToken);
        res.json(omit(accountData, 'refreshToken'));
    } catch (err) { next(err); }
}

async function revokeToken(req, res, next) {
    try {
        const token = req.cookies.refreshToken || req.body.token;
        const ipAddress = req.ip;
        if (!token) return res.status(400).json({ message: 'Token is required' });
        await accountService.revokeToken({ token, ipAddress });
        res.clearCookie('refreshToken');
        res.json({ message: 'Token revoked' });
    } catch (err) { next(err); }
}

async function register(req, res, next) {
    try {
        await accountService.register(req.body, req.get('origin'));
        res.json({ message: 'Registration successful, please check your email for verification instructions' });
    } catch (err) { next(err); }
}

async function verifyEmail(req, res, next) {
    try {
        await accountService.verifyEmail(req.body);
        res.json({ message: 'Verification successful, you can now login' });
    } catch (err) { next(err); }
}

async function forgotPassword(req, res, next) {
    try {
        await accountService.forgotPassword(req.body, req.get('origin'));
        res.json({ message: 'Please check your email for password reset instructions' });
    } catch (err) { next(err); }
}

async function validateResetToken(req, res, next) {
    try {
        await accountService.validateResetToken(req.body);
        res.json({ message: 'Token is valid' });
    } catch (err) { next(err); }
}

async function resetPassword(req, res, next) {
    try {
        await accountService.resetPassword(req.body);
        res.json({ message: 'Password reset successful, you can now login' });
    } catch (err) { next(err); }
}

async function getAll(req, res, next) {
    try {
        const accounts = await accountService.getAll();
        res.json(accounts);
    } catch (err) { next(err); }
}

async function create(req, res, next) {
    try {
        const account = await accountService.create(req.body);
        res.status(201).json(account);
    } catch (err) { next(err); }
}

async function getById(req, res, next) {
    try {
        // users can only access their own account; admins can access any account
        if (req.params.id !== req.auth.id.toString() && req.auth.role !== 'Admin')
            return res.status(401).json({ message: 'Unauthorized' });
        const account = await accountService.getById(req.params.id);
        res.json(account);
    } catch (err) { next(err); }
}

async function update(req, res, next) {
    try {
        // users can only update their own account; admins can update any account
        if (req.params.id !== req.auth.id.toString() && req.auth.role !== 'Admin')
            return res.status(401).json({ message: 'Unauthorized' });
        const account = await accountService.update(req.params.id, req.body);
        res.json(account);
    } catch (err) { next(err); }
}

async function _delete(req, res, next) {
    try {
        // users can only delete their own account; admins can delete any account
        if (req.params.id !== req.auth.id.toString() && req.auth.role !== 'Admin')
            return res.status(401).json({ message: 'Unauthorized' });
        await accountService.delete(req.params.id);
        res.json({ message: 'Account deleted successfully' });
    } catch (err) { next(err); }
}

// helpers

function setTokenCookie(res, token) {
    const cookieOptions = {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        sameSite: process.env.COOKIE_SAMESITE || 'None',
        secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production'
    };
    res.cookie('refreshToken', token, cookieOptions);
}

function omit(obj, ...keys) {
    const result = { ...obj };
    keys.forEach(k => delete result[k]);
    return result;
}
