# Full-Stack Mini Marketplace

A production-like mini marketplace built with Next.js, NestJS, TypeORM, PostgreSQL, and Docker.

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: NestJS, TypeORM, PostgreSQL, JWT auth
- **Infrastructure**: Docker, Docker Compose, GitHub Actions CI

## Features

- Product listing with pagination, search, category filter, and sorting
- JWT-based authentication (register/login)
- Role-based access control (admin vs customer)
- Shopping cart (localStorage, cross-tab sync)
- Order placement and history
- Admin product management (CRUD)
- TypeORM migrations (production-safe)

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### Run with Docker

```bash
# Copy and configure environment
cp .env.example .env

# Start all services
docker compose up -d

# Run database migrations and seed
docker compose exec backend npm run migration:run
docker compose exec backend npm run seed
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

### Local Development

```bash
# Start postgres only
docker compose up postgres -d

# Backend
cd backend
cp .env.example .env
npm install
npm run migration:run
npm run seed
npm run start:dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Seed Credentials

| Role     | Email                  | Password    |
|----------|------------------------|-------------|
| Admin    | admin@marketplace.com  | Admin123!   |
| Customer | customer@marketplace.com | Customer123! |

## API Documentation

### Auth
```
POST /api/auth/register   - Register new user (sets httpOnly JWT cookie)
POST /api/auth/login      - Login (sets httpOnly JWT cookie)
GET  /api/auth/me         - Returns current user (requires cookie)
POST /api/auth/logout     - Clears JWT cookie
```

### Products
```
GET    /api/products             - List products (page, limit, category, search, sortBy, order)
GET    /api/products/:id         - Product detail
POST   /api/products             - Create product (admin only)
PUT    /api/products/:id         - Update product (admin only)
DELETE /api/products/:id         - Delete product (admin only)
```

### Orders
```
POST /api/orders   - Create order (authenticated)
GET  /api/orders   - List user's orders (authenticated)
```

## Testing

```bash
# Backend unit tests
cd backend && npm test

# Frontend unit tests
cd frontend && npm test

# E2E tests (requires running services)
cd frontend && npm run cypress:run
```

## CI/CD

GitHub Actions runs on push/PR to `main` and `technicalAcessments`:
1. **backend**: lint → unit tests (with postgres service)
2. **frontend**: lint → unit tests → build

## Architecture Decisions

- **JWT in httpOnly cookie**: Set server-side on login/register, read via `cookie-parser`; XSS-safe. `SameSite: lax` provides basic CSRF protection for this scope
- **Offset pagination**: Simple to implement; cursor-based would scale better
- **Client-side cart**: No server-side cart persistence keeps scope manageable
- **TypeORM migrations**: Not `synchronize: true` — demonstrates production awareness
- **Separate backend/frontend folders**: Clearer than NestJS monorepo for this scope

## Next Steps / What I'd Build Next

- **Cursor-based pagination** — offset pagination breaks under concurrent inserts; cursor-based is more robust at scale
- **Server-side cart** — persist cart in DB so it survives logout and enables multi-device sync
- **Image uploads** — replace `imageUrl` string with S3/R2 presigned upload and file-type validation
- **Order status management** — admin endpoint to transition order status (confirmed → shipped → delivered)
- **Rate limiting** — add `@nestjs/throttler` on auth endpoints to prevent brute-force attacks
- **Payment integration** — hook Stripe webhooks to confirm orders only on successful payment
