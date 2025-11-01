# Supabase Authentication Setup Guide

This guide walks you through setting up Supabase authentication for the FishMap project.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js and pnpm installed
- FishMap project cloned and dependencies installed

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in (or create an account)
2. Click "New Project" from your dashboard
3. Fill in the project details:
   - **Name**: `fishmap` (or your preferred name)
   - **Database Password**: Choose a strong password (save this securely)
   - **Region**: Select the region closest to your users
   - **Pricing Plan**: Start with the Free plan
4. Click "Create new project" and wait for the project to be provisioned (this may take a few minutes)

## Step 2: Get Your API Keys

Once your project is ready:

1. Navigate to **Settings** (gear icon in the sidebar)
2. Click on **API** in the settings menu
3. You will see two important values:
   - **Project URL**: This is your `VITE_SUPABASE_URL`
   - **anon public key**: This is your `VITE_SUPABASE_ANON_KEY`

Keep these values handy for the next step.

## Step 3: Configure Environment Variables

### For Web App (apps/web)

1. Navigate to the `apps/web` directory
2. Create a `.env` file (or copy from `.env.example`):
   ```bash
   cp ../../.env.example .env
   ```
3. Edit the `.env` file and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

Replace `your-project-id` and `your-anon-key-here` with the actual values from Step 2.

### Important Notes

- The `.env` file should NOT be committed to version control (it's already in `.gitignore`)
- The `anon` key is safe to use in client-side code (it has limited permissions)
- Never share your `service_role` key (if you see one) - this has full access to your database

## Step 4: Configure Supabase Authentication Settings

1. In your Supabase dashboard, go to **Authentication** > **Settings**
2. Configure the following settings:

### Email Authentication

- **Enable Email Signup**: Toggle ON
- **Confirm Email**: You can toggle this OFF for development (toggle ON for production)
- **Secure Email Change**: Toggle ON (recommended)

### Site URL

Set your application's URL:
- For development: `http://localhost:5173`
- For production: Your deployed app URL (e.g., `https://fishmap.example.com`)

### Redirect URLs

Add allowed redirect URLs (one per line):
```
http://localhost:5173/**
https://your-production-domain.com/**
```

## Step 5: Create Database Tables (Optional)

If you want to store user profiles or additional data, you can create tables in Supabase:

1. Go to **Table Editor** in the Supabase dashboard
2. Click "Create a new table"
3. Example user profile table:

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Create policy to allow users to read their own profile
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Create policy to allow users to update their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);
```

You can run this SQL in the **SQL Editor** section of your Supabase dashboard.

## Step 6: Test the Integration

1. Start the development server:
   ```bash
   pnpm dev:web
   ```

2. Navigate to http://localhost:5173

3. Test the authentication flow:
   - Click "Sign Up" to create a new account
   - Fill in the registration form
   - Check your email for a confirmation link (if email confirmation is enabled)
   - Click "Sign In" to log in
   - Try accessing protected routes (Upload, Waypoints, Map)
   - Visit your Profile page
   - Sign out

## Common Issues and Solutions

### Issue: "Missing required Supabase environment variables"

**Solution**: Make sure your `.env` file is in the `apps/web` directory and contains both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### Issue: "Invalid API key"

**Solution**: Double-check that you copied the correct `anon` key from the Supabase dashboard. The key should be quite long (100+ characters).

### Issue: "User not receiving confirmation email"

**Solution**:
- Check your Supabase **Authentication** > **Email Templates** settings
- For development, you can disable email confirmation in **Authentication** > **Settings**
- Check spam folder

### Issue: "CORS errors"

**Solution**: Make sure your redirect URLs are properly configured in Supabase dashboard under **Authentication** > **URL Configuration**.

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different projects** for development and production
3. **Enable email confirmation** for production
4. **Set up Row Level Security (RLS)** for all database tables
5. **Use the `anon` key** for client-side code, never the `service_role` key
6. **Keep your database password secure** - you'll need it for direct database access
7. **Regularly rotate API keys** if there's any chance they've been exposed

## Additional Resources

- [Supabase Authentication Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [FishMap Project Documentation](../README.md)

## Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Review the Supabase dashboard logs
3. Consult the [Supabase Discord community](https://discord.supabase.com/)
4. Check the project's GitHub issues

---

Last updated: 2025-10-31
