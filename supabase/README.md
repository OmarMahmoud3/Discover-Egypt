# Discover Egypt: Supabase Backend Setup & Deployment Guide

This directory contains the database schema and Edge Functions for the **User Management** feature of Discover Egypt.

---

## 1. Database Schema & RLS Setup

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to your project -> **SQL Editor**.
3. Open the file [`supabase/schema.sql`](./schema.sql).
4. Paste the SQL script into the editor and click **Run**.
5. This script configures:
   - `public.profiles` table and check constraint (`role IN ('user', 'admin')`).
   - `on_auth_user_created` trigger for automatic profile generation.
   - Strict Row Level Security (RLS) policies preventing privilege escalation.
   - `admin_update_user_role` database function enforcing atomic invariants (no self-demotion, last administrator protection).

---

## 2. Deploying the `admin-users` Edge Function

The `admin-users` function runs server-side with Supabase Auth Admin APIs to securely retrieve user email addresses and perform role changes without exposing secret keys to the browser.

### Prerequisites

Install the Supabase CLI on your system or use `npx`:

```bash
# Link your project (replace with your project ref: irdrdbwkfccplloirndz)
npx supabase link --project-ref irdrdbwkfccplloirndz
```

### Deployment Command

Deploy the Edge Function directly:

```bash
npx supabase functions deploy admin-users --no-verify-jwt
```
> Note: We handle JWT verification inside the Edge Function using the caller's Authorization header so that we can verify the administrator's profile role and return informative JSON errors (401 / 403).

### Required Environment Variables

Supabase Edge Runtime automatically provides the following secrets inside Edge Functions:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

No additional external secrets need to be configured. The service-role key is kept exclusively on the backend and is never exposed to the frontend.

---

## 3. Resilient Frontend Fallback

If the Edge Function is not yet deployed or is unreachable, the Discover Egypt dashboard (`/admin/users`) automatically falls back to reading profile data directly from `public.profiles` so the administrative interface remains operable. An informative banner is shown to the administrator explaining that deploying the Edge Function is required to view email addresses.
