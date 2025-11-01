# Quick Start: Supabase Authentication

Get up and running with authentication in 5 minutes!

## Prerequisites
- Supabase account (free tier is fine)
- FishMap project already cloned

## Step 1: Create Supabase Project (2 minutes)

1. Go to https://supabase.com
2. Sign in and click "New Project"
3. Fill in:
   - Name: `fishmap`
   - Database Password: (choose a strong password)
   - Region: (closest to you)
4. Click "Create new project" and wait

## Step 2: Get Your Keys (1 minute)

1. In your Supabase dashboard, click **Settings** (gear icon)
2. Click **API**
3. Copy these two values:
   - **Project URL** (looks like: `https://abcdefgh.supabase.co`)
   - **anon public** key (long string)

## Step 3: Configure Environment (1 minute)

1. Navigate to `apps/web` folder
2. Create a `.env` file:
   ```bash
   cd apps/web
   cp ../../.env.example .env
   ```
3. Edit `.env` and paste your values:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-long-anon-key-here
   ```

## Step 4: Enable Email Auth in Supabase (1 minute)

1. In Supabase dashboard, go to **Authentication** > **Settings**
2. Toggle **Enable Email Signup** to ON
3. For testing, toggle **Confirm Email** to OFF (you can enable later)
4. Save changes

## Step 5: Start the App (30 seconds)

```bash
pnpm dev:web
```

Open http://localhost:3000 in your browser

## Step 6: Test It Out!

1. Click "Sign Up" button
2. Create an account with your email
3. Log in with your credentials
4. Try accessing protected routes:
   - Upload Waypoints
   - View Waypoints
   - Map View
5. Visit your Profile page
6. Sign out

## What You Get

- User registration and login
- Session persistence (stays logged in)
- Protected routes (require login)
- User profile page
- Secure authentication with Supabase

## Next Steps

- Read full documentation: `docs/supabase-setup.md`
- Implementation details: `AUTHENTICATION_IMPLEMENTATION.md`
- Customize the UI styling in `apps/web/src/index.css`
- Add user profile tables (see docs)
- Integrate with waypoint features

## Troubleshooting

**"Missing required Supabase environment variables"**
- Make sure `.env` file is in `apps/web` directory
- Check that both URL and key are set

**Can't create account**
- Make sure "Enable Email Signup" is toggled ON in Supabase
- Check browser console for errors

**Not redirecting after login**
- Check that React Router is working
- Look for errors in browser console

**Still having issues?**
See the full troubleshooting guide in `docs/supabase-setup.md`

---

That's it! You now have a fully functional authentication system.
