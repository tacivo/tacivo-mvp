# Company Sharing Feature - Upgrade Guide

## Current Implementation (MVP)

The shared knowledge feature currently uses **simple string matching** on the `company` field in the `profiles` table.

### How It Works Now

```sql
-- Users are in the same company if company names match exactly
WHERE company = (SELECT company FROM profiles WHERE id = auth.uid())
```

**Example:**
- User A: company = "Acme Corp"
- User B: company = "Acme Corp"  ✅ Can see each other's shared docs
- User C: company = "ACME CORP"  ❌ Cannot see A & B's docs (case sensitive)

### Limitations

1. **Case sensitive** - "Acme" ≠ "ACME"
2. **Typo sensitive** - "Acme Corp" ≠ "Acme Corporation"
3. **No validation** - Users can type anything
4. **No company admin** - Anyone can "join" by typing the name

---

## Upgrade Path 1: Email Domain Matching

**Best for:** Companies with corporate email addresses

### Changes Required

**1. Update RLS Policy** (`supabase/migrations/005_email_domain_matching.sql`):

```sql
-- Drop current policy
DROP POLICY IF EXISTS "Users can view own or shared company documents" ON documents;

-- Create email domain-based policy
CREATE POLICY "Users can view own or domain-shared documents" ON documents
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    (
      is_shared = TRUE
      AND SPLIT_PART(user_id::text, '@', 2) IN (
        SELECT SPLIT_PART(email, '@', 2)
        FROM profiles
        WHERE id = auth.uid()
      )
    )
  );
```

**2. Update Helper Function** (`lib/supabase/interviews.ts`):

```typescript
export async function getSharedCompanyDocuments() {
  // Get current user's email domain
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return [];

  const userDomain = user.email.split('@')[1];

  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      profiles!inner (
        id,
        full_name,
        role,
        email
      )
    `)
    .eq('is_shared', true)
    .like('profiles.email', `%@${userDomain}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as any[];
}
```

**Benefits:**
- ✅ Automatic company membership (@acme.com = Acme Corp)
- ✅ No user input required
- ✅ No typos possible

**Drawbacks:**
- ❌ Doesn't work for personal emails (gmail.com, etc.)
- ❌ Contractors/external users excluded
- ❌ Multi-company emails (consultants) see everything

---

## Upgrade Path 2: Companies Table

**Best for:** Production apps with proper company management

### Schema Changes

**1. Create Companies Table** (`supabase/migrations/005_companies_table.sql`):

```sql
-- Create companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- URL-friendly: "acme-corp"
  domain TEXT,                 -- Optional email domain
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add company_id to profiles
ALTER TABLE profiles
  ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX idx_profiles_company_id ON profiles(company_id);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Users can view their own company
CREATE POLICY "Users can view their company" ON companies
  FOR SELECT
  USING (
    id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );
```

**2. Update Documents RLS Policy**:

```sql
DROP POLICY IF EXISTS "Users can view own or shared company documents" ON documents;

CREATE POLICY "Users can view own or company-shared documents" ON documents
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    (
      is_shared = TRUE
      AND user_id IN (
        SELECT id FROM profiles
        WHERE company_id = (
          SELECT company_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );
```

**3. Update Helper Function**:

```typescript
export async function getSharedCompanyDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      profiles!inner (
        id,
        full_name,
        role,
        company:companies (
          id,
          name
        )
      )
    `)
    .eq('is_shared', true)
    // RLS automatically filters to same company
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as any[];
}
```

**4. Add Company Management**:

Create admin pages:
- `/admin/company` - View company details
- `/admin/company/invite` - Invite users by email
- `/admin/company/members` - View all members

**Benefits:**
- ✅ Proper data normalization
- ✅ Admin control over membership
- ✅ Can add company settings later
- ✅ Multiple companies per database
- ✅ Company branding (logo, colors)
- ✅ Usage analytics per company

**Drawbacks:**
- ❌ More complex setup
- ❌ Requires admin interface
- ❌ Need invitation system

---

## Upgrade Path 3: Hybrid Approach

**Best for:** Flexibility during growth

### Implementation

Use **email domain** for initial auto-join, but allow **manual company creation** for edge cases.

```sql
-- Companies table (from Path 2)
-- Plus auto-join function:

CREATE OR REPLACE FUNCTION auto_assign_company()
RETURNS TRIGGER AS $$
DECLARE
  user_domain TEXT;
  existing_company_id UUID;
BEGIN
  -- Extract email domain
  user_domain := SPLIT_PART(NEW.email, '@', 2);

  -- Skip personal domains
  IF user_domain IN ('gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com') THEN
    RETURN NEW;
  END IF;

  -- Find existing company by domain
  SELECT id INTO existing_company_id
  FROM companies
  WHERE domain = user_domain
  LIMIT 1;

  -- Auto-assign if found
  IF existing_company_id IS NOT NULL THEN
    NEW.company_id := existing_company_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on profile creation
CREATE TRIGGER auto_assign_company_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_company();
```

**Benefits:**
- ✅ Best of both worlds
- ✅ Auto-join for corporate emails
- ✅ Manual join for others
- ✅ Flexible and scalable

---

## Migration Steps

### For Any Upgrade Path:

1. **Backup data** - Export profiles and documents
2. **Test in development** - Use staging database
3. **Run migration** - Apply SQL changes
4. **Update code** - Deploy new functions
5. **Verify RLS** - Test access controls
6. **Monitor** - Check for errors

### Zero-Downtime Migration:

```sql
-- Step 1: Add new column (doesn't break anything)
ALTER TABLE profiles ADD COLUMN company_id UUID;

-- Step 2: Backfill data (run offline)
-- Match existing company strings to new IDs

-- Step 3: Update RLS policies (atomic switch)
-- Step 4: Deploy new code
-- Step 5: Drop old column (after verification)
ALTER TABLE profiles DROP COLUMN company;
```

---

## Recommendation

**Start:** Keep current simple string matching for MVP

**When to upgrade:**
- **≤ 10 users:** Stay with string matching
- **10-100 users:** Use email domain (Path 1)
- **100+ users or B2B:** Use companies table (Path 2 or 3)

---

## Testing Checklist

After upgrading, verify:

- [ ] Users can share documents
- [ ] Shared docs appear for company members
- [ ] Shared docs don't leak to other companies
- [ ] Users can unshare documents
- [ ] New users auto-join correct company
- [ ] Old shared docs still work
- [ ] Dashboard shows correct shared docs
- [ ] Document detail page shows share button
- [ ] RLS policies block unauthorized access

---

## Code Locations

Files to update when upgrading:

1. **Database:**
   - `supabase/migrations/00X_upgrade.sql`

2. **Helper Functions:**
   - `lib/supabase/interviews.ts` (shareDocument, getSharedCompanyDocuments)

3. **UI Components:**
   - `app/documents/[id]/page.tsx` (share button)
   - `app/dashboard/page.tsx` (collective knowledge section)

4. **Types (if adding companies table):**
   - `types/database.types.ts`

No changes needed in interview flow, authentication, or other features.

---

## Support

If you encounter issues during upgrade:
1. Check Supabase logs for RLS errors
2. Verify user's company field is set
3. Test RLS policies in SQL editor
4. Check browser console for API errors
