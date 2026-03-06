# Equinemates Shop

Equinemates is a Next.js ecommerce foundation focused on:

- Pet Products
- Horse Products
- Rider Products

This project includes a production-oriented frontend structure and backend-ready API modules for catalog browsing, account/auth flows, wishlist/cart, wholesale quoting, checkout, and admin operations.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind v4 base import + custom CSS design system
- In-memory service layer (replaceable with database-backed adapters)

## Key Features

- Global header/footer on all pages
- Center-positioned brand logo in top navigation
- Category dropdown + SKU/name search + auto suggestions
- Multi-currency support (`PKR`, `USD`, `EUR`) with:
  - PKR default
  - locale-based auto-detect
  - manual currency switcher
- Account workflows:
  - email signup/login
  - Google login integration entry point
  - password recovery token endpoint
  - profile and address management
  - order history
  - wishlist synchronization interface
- Core pages:
  - home
  - about
  - contact (with map + support hours)
  - catalog request
  - wholesale quotation
  - wishlist
  - cart and checkout
- Product system:
  - gallery
  - SKU
  - variants
  - reviews
  - related products
- Wholesale dashboard:
  - quote history
  - edit request module placeholder
  - invoice module placeholder
  - messaging module placeholder
- Admin panel modules:
  - products
  - orders
  - users
  - wholesale
  - reports
  - promotions
  - currency rates
- SEO and discoverability:
  - route-level metadata
  - `robots.ts`
  - `sitemap.ts`

## Project Structure

```text
app/
  api/
    auth/
    account/
    catalog/request
    wholesale/request
    checkout
    search
    currency/rates
  about/
  contact/
  catalog-request/
  wholesale/
  wholesale/dashboard/
  products/
  products/[slug]/
  search/
  wishlist/
  cart/
  account/
  account/orders/
  account/addresses/
  admin/
components/
  layout/
  providers/
  catalog/
  forms/
  account/
lib/
  catalog.ts
  currency.ts
  navigation.ts
  types.ts
  server/
    db.ts
    profile-service.ts   # replaced previous auth-service logic
    submissions-service.ts
    checkout-service.ts
    currency-service.ts
public/
  products/*.svg
```

## Run Locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Live Deployment

- Production domain: `https://equinemates-shop.vercel.app`
- Vercel project: `https://vercel.com/khurrams-projects/equinemates-shop`

## Authentication is delegated to Clerk, so demo accounts are no longer seeded locally

Use the Clerk dashboard or test user fixtures instead.

## API Endpoints

<!-- authentication is now handled by Clerk; the built-in API routes above have been removed -->
- `GET /api/account/profile`
- `PUT /api/account/profile`
- `GET /api/account/orders`
- `GET /api/account/wishlist`
- `POST /api/account/wishlist`
- `POST /api/contact`
- `POST /api/catalog/request`
- `POST /api/wholesale/request`
- `POST /api/checkout`
- `GET /api/search`
- `GET /api/currency/rates`

## Production Readiness Steps

1. Replace in-memory store with PostgreSQL/MySQL (Prisma/Drizzle).
2. Integrate Clerk for secure sessions.
3. Connect payment processors for live card and bank settlement.
4. Add transactional email provider (catalog requests, order updates).
5. Add object storage for upload persistence.
6. Add role-based access control for admin and wholesale dashboards.
7. Add observability (structured logs, traces, error monitoring).
8. Add integration and e2e tests.

## TODO (Chosen Stack)

- [ ] Database: migrate to Neon Postgres.
- [ ] ORM: adopt Prisma and move catalog/products out of in-memory data.
- [ ] Auth: keep Clerk as the authentication provider.
- [ ] Media storage: setup Cloudflare R2 for product images.
- [ ] setup Cloudflare Caching
- [ ] impliment Cloudflare Speed services
- [ ] impliment Cloudflare Traffic services
- [ ] 

## Branding Assets

Place these in `public/`:

- `logo-t.png` (transparent logo)
- `logo-small.png` (favicon)

The layout already references both files.
