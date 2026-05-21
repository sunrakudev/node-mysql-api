require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const errorHandler = require('./_middleware/error-handler');
const db = require('./_helpers/db');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true
}));

// swagger docs
const swaggerDocument = require('./swagger.json');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// api routes
app.use('/accounts', require('./accounts'));

// global error handler
app.use(errorHandler);

const port = process.env.PORT || 4000;

db.initialize()
    .then(() => {
        app.listen(port, () => console.log(`Server listening on port ${port}`));
    })
    .catch(err => {
        console.error('Failed to connect to database:', err.message);
        process.exit(1);
    });
