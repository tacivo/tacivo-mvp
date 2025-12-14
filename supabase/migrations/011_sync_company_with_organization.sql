-- Function to sync company field with organization name
CREATE OR REPLACE FUNCTION sync_profile_company()
RETURNS TRIGGER AS $$
BEGIN
  -- If organization_id is set, update company field with organization name
  IF NEW.organization_id IS NOT NULL THEN
    NEW.company := (
      SELECT name
      FROM organizations
      WHERE id = NEW.organization_id
    );
  ELSE
    -- If organization_id is NULL, keep company as is (for backwards compatibility)
    -- or set to NULL if you want to clear it
    NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT or UPDATE of profiles
CREATE TRIGGER sync_profile_company_trigger
  BEFORE INSERT OR UPDATE OF organization_id
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_company();

-- Update existing profiles to sync company with organization name
UPDATE profiles p
SET company = o.name
FROM organizations o
WHERE p.organization_id = o.id
  AND (p.company IS NULL OR p.company != o.name);

-- Function to update all profiles when an organization name changes
CREATE OR REPLACE FUNCTION update_profiles_company_on_org_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all profiles that belong to this organization
  UPDATE profiles
  SET company = NEW.name
  WHERE organization_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on UPDATE of organizations name
CREATE TRIGGER update_profiles_company_trigger
  AFTER UPDATE OF name
  ON organizations
  FOR EACH ROW
  WHEN (OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION update_profiles_company_on_org_change();

-- Add comment
COMMENT ON FUNCTION sync_profile_company() IS 'Automatically syncs the company field in profiles with the organization name';
COMMENT ON FUNCTION update_profiles_company_on_org_change() IS 'Updates all profile company fields when organization name changes';
