# Node.js + MySQL API

Node.js REST API with email sign-up, verification, authentication and forgot password.

**Live API:** https://node-mysql-api-0foa.onrender.com/api-docs
**API Docs:** https://node-mysql-api-0foa.onrender.com/api-docs  
**Frontend:** https://angular21-auth-boilerplate-bt8r.onrender.com

## Features

- Email sign up with verification token
- JWT access tokens (15 min) + refresh tokens via httpOnly cookie (7 days)
- Role-based authorization (Admin / User)
- Forgot password and reset password via email
- Full CRUD for account management (admin only)
- Swagger documentation at `/api-docs`

## Tech Stack

- Node.js + Express
- MySQL with Sequelize ORM
- JSON Web Tokens (jsonwebtoken)
- bcryptjs for password hashing
- Nodemailer + Mailtrap for emails
- Swagger UI for API docs

## Project Structure

```
├── server.js              # Entry point
├── accounts/
│   ├── index.js           # Routes and request handlers
│   └── account.service.js # Business logic
├── _helpers/
│   ├── db.js              # Sequelize connection and Account model
│   └── send-email.js      # Nodemailer helper
├── _middleware/
│   ├── authorize.js       # JWT auth middleware
│   ├── error-handler.js   # Global error handler
│   └── validate-request.js
└── swagger.json           # API documentation
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/accounts/authenticate` | Login and get JWT token |
| POST | `/accounts/refresh-token` | Refresh JWT using cookie |
| POST | `/accounts/revoke-token` | Logout / revoke refresh token |
| POST | `/accounts/register` | Register new account |
| POST | `/accounts/verify-email` | Verify email with token |
| POST | `/accounts/forgot-password` | Send password reset email |
| POST | `/accounts/validate-reset-token` | Validate reset token |
| POST | `/accounts/reset-password` | Reset password |
| GET | `/accounts` | Get all accounts (Admin) |
| POST | `/accounts` | Create account (Admin) |
| GET | `/accounts/:id` | Get account by id |
| PUT | `/accounts/:id` | Update account |
| DELETE | `/accounts/:id` | Delete account |

## Local Development

Copy `.env.example` to `.env` and fill in your values:

```bash
npm install
npm start
```

Runs on `http://localhost:4000`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DB_HOST` | MySQL host |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_DATABASE` | MySQL database name |
| `JWT_SECRET` | Secret key for signing JWTs |
| `SMTP_HOST` | SMTP server host |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password / API key |
| `EMAIL_FROM` | From address for emails |
| `CORS_ORIGIN` | Allowed frontend origin |

## Author

[Earl Justine Coyoca](https://github.com/sunrakudev)
