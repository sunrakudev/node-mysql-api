const { Sequelize, DataTypes, Op } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_DATABASE,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false
    }
);

const Account = sequelize.define('Account', {
    email: { type: DataTypes.STRING, allowNull: false },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    title: DataTypes.STRING,
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    acceptTerms: DataTypes.BOOLEAN,
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'User' },
    verificationToken: DataTypes.STRING,
    verified: DataTypes.DATE,
    resetToken: DataTypes.STRING,
    resetTokenExpires: DataTypes.DATE,
    passwordReset: DataTypes.DATE,
    refreshTokens: {
        type: DataTypes.TEXT,
        get() {
            const val = this.getDataValue('refreshTokens');
            return val ? JSON.parse(val) : [];
        },
        set(val) {
            this.setDataValue('refreshTokens', JSON.stringify(val || []));
        }
    },
    isVerified: {
        type: DataTypes.VIRTUAL,
        get() {
            return !!(this.verified || this.passwordReset);
        }
    }
}, {
    timestamps: true,
    createdAt: 'created',
    updatedAt: 'updated'
});

const db = {
    Account,
    Op,
    sequelize,
    async initialize() {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });
    }
};

module.exports = db;
