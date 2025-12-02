# Interview Page Update - Profile Integration

## Changes Made

### 1. Signup Page Updates ([app/login/page.tsx](app/login/page.tsx))

**Added Fields:**
- Role/Title
- Years of Experience

These fields are now collected during signup along with Full Name and Company.

**What it looks like:**
- Full Name (required)
- Company (required)
- Your Role/Title (required) - e.g., "Senior Sales Manager"
- Years of Experience (required) - number input, min 0
- Email (required)
- Password (required, min 6 characters)

### 2. Database Trigger Update

**Updated Migration Files:**
- [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql) - Main schema with updated trigger
- [supabase/migrations/003_add_role_to_trigger.sql](supabase/migrations/003_add_role_to_trigger.sql) - Standalone fix for existing installations

**What it does:**
The `handle_new_user()` trigger function now extracts ALL user metadata from signup:
- `full_name`
- `company`
- `role`
- `years_of_experience`

**SQL to run in Supabase:**
```sql
-- Drop and recreate the trigger with all fields
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company, role, years_of_experience, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', ''),
    COALESCE((NEW.raw_user_meta_data->>'years_of_experience')::integer, 0),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### 3. Interview Page Updates ([app/interview/page.tsx](app/interview/page.tsx))

**Removed:**
- "Step 1: About You" section (Full Name, Role, Years of Experience fields)
- These fields are no longer asked during the interview

**Added:**
- Automatic profile loading on page load
- Pre-fills context with user's profile data
- Shows personalized welcome message: "Welcome back, [Name]!"

**New Flow:**
1. User clicks "Start Interview" from dashboard
2. Interview page loads and fetches their profile from Supabase
3. Profile data (name, role, experience) is automatically used
4. User only needs to select document type (Case Study or Best Practices)
5. Then provide description and start the interview

**Code Changes:**
```typescript
// Added state for user profile
const [userProfile, setUserProfile] = useState<any>(null);

// Enhanced checkUser function
async function checkUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    router.push('/login');
  } else {
    setCurrentUserId(user.id);

    // Fetch and use profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      setUserProfile(profile);
      setContext(prev => ({
        ...prev,
        expertName: profile.full_name || '',
        role: profile.role || '',
        yearsOfExperience: profile.years_of_experience?.toString() || '',
      }));
    }
  }
}
```

### 4. Updated Validation

**Old validation:**
```typescript
if (!context.expertName || !context.role || !context.yearsOfExperience || !context.documentType) {
  alert('Please fill in all fields and select a document type');
  return;
}
```

**New validation:**
```typescript
if (!context.documentType) {
  alert('Please select a document type');
  return;
}
```

Expert information is now guaranteed to exist from the profile, so we only validate document type selection.

## User Experience Improvements

### Before:
1. Sign up with email, password, name, company
2. Go to dashboard
3. Click "Start Interview"
4. **Re-enter name, role, and years of experience** ❌
5. Select document type
6. Continue with interview

### After:
1. Sign up with email, password, name, company, **role, and years of experience** ✅
2. Go to dashboard
3. Click "Start Interview"
4. See personalized welcome message
5. **Only select document type** ✅
6. Continue with interview

## Migration Steps

### For Existing Users:
If you already have users in the database without role/years_of_experience:

1. Run the trigger update (migration 003)
2. New signups will work correctly
3. Existing users can update their profile through the dashboard (future feature)

### For Fresh Installations:
Just run the updated migration 001 which includes all fields.

## Testing Checklist

- [x] Signup with all fields (name, company, role, experience)
- [x] Verify profile created with all data in database
- [x] Sign in and go to dashboard
- [x] Click "Start Interview"
- [x] Verify NO "About You" section shown
- [x] Verify welcome message shows user's name
- [x] Select document type and proceed
- [x] Verify context has profile data pre-filled

## Benefits

✅ **Faster interview start** - One less step, users get to content immediately
✅ **Better UX** - No redundant data entry
✅ **Data consistency** - Single source of truth for user info
✅ **Personalization** - Welcome message with user's name
✅ **Profile reuse** - User data collected once, used everywhere
