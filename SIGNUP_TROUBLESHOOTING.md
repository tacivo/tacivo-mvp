# Signup Troubleshooting Guide

## Issue: "Database error saving new user" (500 Error)

**SOLUTION FOUND:** The profile creation trigger needs to be fixed. The trigger wasn't extracting the `full_name` and `company` from signup metadata.

### Quick Fix:

1. Go to your Supabase dashboard SQL Editor
2. Run the contents of `supabase/migrations/002_fix_profile_trigger.sql`
3. Try signing up again - it should work now!

The fix updates the `handle_new_user()` function to properly extract metadata from `raw_user_meta_data`.

---

## Other Potential Issues

### Step 1: Check Browser Console

1. Open the login page at http://localhost:3000/login
2. Toggle to "Sign up" mode
3. Open browser DevTools (F12 or Cmd+Option+I on Mac)
4. Go to the Console tab
5. Try to sign up with test credentials
6. Check the console logs - you should see:
   - "Starting signup with: {email, fullName, company}"
   - "Signup response: {authData, signUpError}"
   - Either success logs or error details

### Step 2: Verify Supabase Database Setup

The signup might fail if the database migration hasn't been run yet.

**Check if migration is needed:**

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project (nlplxlcrvtemgmjjqxad)
3. Go to the SQL Editor
4. Run this query to check if tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**If tables don't exist, run the migration:**

1. In the SQL Editor, copy the entire contents of `supabase/migrations/001_initial_schema.sql`
2. Paste it into the SQL Editor
3. Click "Run"

**Verify the trigger was created:**

```sql
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'users';
```

You should see `on_auth_user_created` trigger.

### Step 3: Check Email Confirmation Settings

By default, Supabase requires email confirmation for new signups.

**Option A: Disable email confirmation (for development):**

1. Go to Authentication > Providers > Email
2. Uncheck "Enable email confirmations"
3. Save changes
4. Try signing up again - should work immediately

**Option B: Check your email:**

If email confirmation is enabled:
1. Check the email inbox you used for signup
2. Look for confirmation email from Supabase
3. Click the confirmation link
4. Then try to sign in with your credentials

### Step 4: Common Error Messages

**"User already registered"**
- This email has already been used
- Try a different email address
- Or sign in instead of signing up

**"Invalid login credentials"**
- You're trying to sign in but haven't confirmed your email yet
- Check your email for confirmation link

**"Password should be at least 6 characters"**
- Supabase requires minimum 6 character passwords
- Try a longer password

**No error shown but nothing happens**
- Check browser console for JavaScript errors
- Check Network tab in DevTools for failed requests
- Verify environment variables are set correctly

### Step 5: Test with SQL Insert (Bypass)

If signup still doesn't work, you can manually create a test user:

1. Go to SQL Editor in Supabase
2. Run:

```sql
-- Create test user in auth.users (this is usually done by Supabase Auth)
-- Note: This is for testing only, use proper signup in production

-- First, insert into profiles table manually
INSERT INTO profiles (id, email, full_name, company)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'test@example.com',
  'Test User',
  'Test Company'
);
```

Then use Supabase dashboard to create the auth user:
- Go to Authentication > Users
- Click "Add user"
- Enter email and password
- The profile should already exist from the SQL insert above

### Step 6: Verify Environment Variables

Check `.env.local` has correct values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://nlplxlcrvtemgmjjqxad.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Restart the dev server after any `.env.local` changes:
```bash
npm run dev
```

### Current Enhanced Error Logging

The signup flow now includes detailed console logging at each step:
1. Starting signup with user details
2. Supabase signup response
3. User creation confirmation
4. Profile update attempt and result
5. Session creation or email confirmation required

Check your browser console to see exactly where the signup process is failing.

## Next Steps After Successful Signup

Once you can sign up successfully:

1. You should see "Account created successfully! Redirecting..." message
2. Or "Account created! Please check your email to confirm your account." if email confirmation is enabled
3. After confirmation (if needed), you can sign in
4. You'll be redirected to the dashboard
5. Dashboard should show your profile information and stats

## Need More Help?

If none of the above works:
1. Share the exact error message from the browser console
2. Share any error messages from the Supabase dashboard logs
3. Verify the migration SQL was run successfully
4. Check Authentication settings in Supabase dashboard
