# AMA STORE Backend

Node/Express API for AMA STORE.

## Setup

1. Copy `.env.example` to `.env`.
2. Put your MongoDB Atlas connection string in `MONGODB_URI`.
3. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Do not sign up with this email. The first successful admin login creates the admin account automatically.
4. Run:

```bash
npm install
npm run dev
```

The API and frontend will run from:

```txt
http://localhost:5000
```

If you open the frontend with Live Server on port `5500`, keep this backend running on port `5000`. The frontend will call `http://localhost:5000/api` automatically during local development.

## Deployment Checklist

Deploy the backend as the app server so it serves both `/api/...` and the frontend files from the same domain. Set these environment variables in your hosting dashboard:

- `MONGODB_URI`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `PORT` if your host requires it

In MongoDB Atlas, open **Network Access** and allow the hosted server to connect. For platforms with changing outbound IPs, use `0.0.0.0/0` while testing or choose a host with a fixed outbound IP. If Atlas blocks the server IP, login cannot succeed because the database is unreachable.

You can check the server with:

```txt
/api/health
```

It should return `database: "connected"` before login will work.

## MongoDB Collections

Use the `ama_store` database with these collections:

- `users`
- `admins`
- `products`
- `orders`

## API

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/products`
- `POST /api/products` admin only
- `PUT /api/products/:id` admin only
- `DELETE /api/products/:id` admin only
- `GET /api/orders` admin only
- `POST /api/orders`
