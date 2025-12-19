-- Fix: Invitation links not working across browsers/devices
--
-- NOTE: We do NOT add public SELECT policies on invitations/admin_invitations tables
-- for security reasons. Instead, invitation verification is handled through a secure
-- API endpoint (/api/invitations/verify) that uses the service role to bypass RLS.
--
-- This approach is more secure because:
-- 1. It prevents enumeration of all invitations by unauthenticated users
-- 2. Only invitations with valid tokens can be accessed
-- 3. The service role key is kept server-side only
-- 4. Rate limiting and additional validation can be added at the API level
--
-- The invitation acceptance flow now works as follows:
-- 1. User clicks invitation link with token in URL
-- 2. Frontend calls /api/invitations/verify with the token
-- 3. API uses service role to verify and return invitation details
-- 4. User can then accept the invitation through the UI

COMMENT ON TABLE invitations IS
'User invitations - access controlled via API endpoint using service role for security';

COMMENT ON TABLE admin_invitations IS
'Admin invitations - access controlled via API endpoint using service role for security';
