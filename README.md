# FulfillX — Fulfillment Operations Hub

FulfillX is a take-home project for the Karmic Seed Operations Analyst hiring process.

## What it solves

- Central order status visibility
- Priority/SLA visibility
- Simple warehouse picking workflow
- Packing and staging queues
- Courier dispatch visibility
- Main/secondary warehouse inventory
- Stock transfer workflow
- Trackable operational issues
- Basic operational analytics

## Tech

- React + Vite
- Supabase Postgres + Data API
- Supabase SQL RPCs for atomic operational transitions
- Vercel deployment

## Local setup

1. Install Node.js 20+.
2. Install dependencies:

```bash
npm install
```

3. Create a Supabase project.
4. Open Supabase SQL Editor and run:

```text
supabase/schema.sql
```

5. Copy `.env.example` to `.env.local`.

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

6. Start:

```bash
npm run dev
```

7. Open the URL printed by Vite.

## Deploy to Vercel

Push this folder to GitHub and import the repository into Vercel.

Build command:

```text
npm run build
```

Output directory:

```text
dist
```

Add these Vercel environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

The included `vercel.json` rewrites client-side routes to `index.html`.

## Supabase security note

This demo intentionally has public RLS policies so an interviewer can open the hosted application without creating an account.

For a production deployment, replace the demo policies with Supabase Auth + authenticated RLS policies. Never put a Supabase service-role key in a Vite/browser environment.

## Demo flow

1. Dashboard → see SLA and operational alerts.
2. Orders → open order #10482.
3. Picking → confirm the pick.
4. Order moves to Packing.
5. Packing → move it to Staged.
6. Staging → hand it to courier.
7. Inventory → create/complete a stock transfer.
8. Issues → resolve an operational issue.
9. Analytics → explain how the system supports daily decisions.

## Recommended interview narrative

The application is deliberately designed around the warehouse worker and operations manager, not around the database.

The highest-priority problems selected were:
1. Lack of real-time order visibility.
2. Priority/SLA orders getting missed.
3. Inventory mismatch between main and overflow warehouse.
4. Informal issue handling.
5. Packed/staged orders becoming operationally invisible.

The key design principle is a shared order state machine:

Processing → Picking → Packing → Staged → Shipped

Every transition is persisted in Supabase, so the dashboard and operational screens are different views of the same operational truth.
