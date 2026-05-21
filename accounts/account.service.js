const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../_helpers/db');
const sendEmail = require('../_helpers/send-email');

module.exports = {
    authenticate,
    refreshToken,
    revokeToken,
    register,
    verifyEmail,
    forgotPassword,
    validateResetToken,
    resetPassword,
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

async function authenticate({ email, password, ipAddress }) {
    const account = await db.Account.findOne({ where: { email } });
    if (!account || !account.isVerified || !bcrypt.compareSync(password, account.passwordHash))
        throw 'Email or password is incorrect';

    const jwtToken = generateJwtToken(account);
    const refreshToken = generateRefreshToken();

    const tokens = account.refreshTokens.filter(t => new Date(t.expires) > new Date());
    tokens.push(refreshToken);
    account.refreshTokens = tokens;
    await account.save();

    setRefreshTokenCookie(refreshToken.token, null);

    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: refreshToken.token
    };
}

async function refreshToken({ token, ipAddress }) {
    const account = await getAccountByRefreshToken(token);
    if (!account) throw 'Invalid token';

    const existingToken = account.refreshTokens.find(t => t.token === token);
    const newRefreshToken = generateRefreshToken();

    const tokens = account.refreshTokens
        .filter(t => t.token !== token && new Date(t.expires) > new Date());
    tokens.push(newRefreshToken);
    account.refreshTokens = tokens;
    await account.save();

    const jwtToken = generateJwtToken(account);

    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: newRefreshToken.token
    };
}

async function revokeToken({ token, ipAddress }) {
    const account = await getAccountByRefreshToken(token);
    if (!account) throw 'Invalid token';

    account.refreshTokens = account.refreshTokens.filter(t => t.token !== token);
    await account.save();
}

async function register(params, origin) {
    if (await db.Account.findOne({ where: { email: params.email } })) {
        await sendAlreadyRegisteredEmail(params.email, origin);
        return;
    }

    const isFirstAccount = (await db.Account.count()) === 0;

    const account = db.Account.build({
        ...params,
        role: isFirstAccount ? 'Admin' : 'User',
        verificationToken: randomTokenString(),
        refreshTokens: []
    });
    account.passwordHash = bcrypt.hashSync(params.password, 10);
    account.acceptTerms = params.acceptTerms;
    await account.save();

    await sendVerificationEmail(account, origin);
}

async function verifyEmail({ token }) {
    const account = await db.Account.findOne({ where: { verificationToken: token } });
    if (!account) throw 'Verification failed';

    account.verified = new Date();
    account.verificationToken = null;
    await account.save();
}

async function forgotPassword({ email }, origin) {
    const account = await db.Account.findOne({ where: { email } });
    if (!account) return;

    account.resetToken = randomTokenString();
    account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await account.save();

    await sendPasswordResetEmail(account, origin);
}

async function validateResetToken({ token }) {
    const account = await db.Account.findOne({
        where: { resetToken: token }
    });
    if (!account || new Date() > new Date(account.resetTokenExpires))
        throw 'Invalid token';
    return account;
}

async function resetPassword({ token, password }) {
    const account = await validateResetToken({ token });

    account.passwordHash = bcrypt.hashSync(password, 10);
    account.passwordReset = new Date();
    account.resetToken = null;
    account.resetTokenExpires = null;
    await account.save();
}

async function getAll() {
    const accounts = await db.Account.findAll();
    return accounts.map(x => basicDetails(x));
}

async function getById(id) {
    const account = await getAccount(id);
    return basicDetails(account);
}

async function create(params) {
    if (await db.Account.findOne({ where: { email: params.email } }))
        throw `Email "${params.email}" is already registered`;

    const account = db.Account.build(params);
    account.verified = new Date();
    account.passwordHash = bcrypt.hashSync(params.password, 10);
    account.refreshTokens = [];
    await account.save();

    return basicDetails(account);
}

async function update(id, params) {
    const account = await getAccount(id);

    if (params.email && params.email !== account.email &&
        await db.Account.findOne({ where: { email: params.email } }))
        throw `Email "${params.email}" is already registered`;

    if (params.password)
        params.passwordHash = bcrypt.hashSync(params.password, 10);

    Object.assign(account, params);
    account.updated = new Date();
    await account.save();

    return basicDetails(account);
}

async function _delete(id) {
    const account = await getAccount(id);
    await account.destroy();
}

// helpers

async function getAccount(id) {
    const account = await db.Account.findByPk(id);
    if (!account) throw 'Account not found';
    return account;
}

async function getAccountByRefreshToken(token) {
    const accounts = await db.Account.findAll();
    return accounts.find(a => {
        const tokens = a.refreshTokens || [];
        return tokens.some(t => t.token === token && new Date(t.expires) > new Date());
    });
}

function basicDetails(account) {
    const { id, title, firstName, lastName, email, role, created, updated, isVerified } = account;
    return { id, title, firstName, lastName, email, role, created, updated, isVerified };
}

function generateJwtToken(account) {
    return jwt.sign({ id: account.id, sub: account.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken() {
    return {
        token: randomTokenString(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
}

function randomTokenString() {
    return crypto.randomBytes(40).toString('hex');
}

function setRefreshTokenCookie(token, res) {
    // placeholder — actual cookie is set in the controller
}

async function sendVerificationEmail(account, origin) {
    let message;
    if (origin) {
        const verifyUrl = `${origin}/account/verify-email?token=${account.verificationToken}`;
        message = `<p>Please click the below link to verify your email address:</p>
                   <p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
    } else {
        message = `<p>Please use the below token to verify your email address with the <code>/accounts/verify-email</code> api route:</p>
                   <p><code>${account.verificationToken}</code></p>`;
    }

    await sendEmail({
        to: account.email,
        subject: 'Sign-up Verification - Verify Email',
        html: `<h4>Verify Email</h4>
               <p>Thanks for registering!</p>
               ${message}`
    });
}

async function sendAlreadyRegisteredEmail(email, origin) {
    let message;
    if (origin) {
        message = `<p>If you don't know your password please visit the <a href="${origin}/account/forgot-password">forgot password</a> page.</p>`;
    } else {
        message = `<p>If you don't know your password you can reset it via the <code>/accounts/forgot-password</code> api route.</p>`;
    }

    await sendEmail({
        to: email,
        subject: 'Sign-up Verification - Email Already Registered',
        html: `<h4>Email Already Registered</h4>
               <p>Your email <strong>${email}</strong> is already registered.</p>
               ${message}`
    });
}

async function sendPasswordResetEmail(account, origin) {
    let message;
    if (origin) {
        const resetUrl = `${origin}/account/reset-password?token=${account.resetToken}`;
        message = `<p>Please click the below link to reset your password, the link will be valid for 1 day:</p>
                   <p><a href="${resetUrl}">${resetUrl}</a></p>`;
    } else {
        message = `<p>Please use the below token to reset your password with the <code>/accounts/reset-password</code> api route:</p>
                   <p><code>${account.resetToken}</code></p>`;
    }

    await sendEmail({
        to: account.email,
        subject: 'Sign-up Verification - Reset Password',
        html: `<h4>Reset Password</h4>
               ${message}`
    });
}
