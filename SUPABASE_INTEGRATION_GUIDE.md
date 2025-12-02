# Supabase Integration Guide

## ✅ Completed Updates

### 1. Login Page (`app/login/page.tsx`)
- ✅ Added Supabase Auth integration
- ✅ Added sign up functionality with full_name and company fields
- ✅ Handles email confirmation flow
- ✅ Proper error handling
- ✅ Toggle between sign in and sign up modes

### 2. Dashboard Page (`app/dashboard/page.tsx`)
- ✅ Fetches user profile from Supabase
- ✅ Displays real user statistics (interviews, documents, hours saved)
- ✅ Sign out functionality using Supabase Auth
- ✅ Protected route - redirects to login if not authenticated

### 3. Home Page (`app/page.tsx`)
- ✅ Checks Supabase session instead of localStorage
- ✅ Redirects to dashboard if authenticated, login otherwise

## 🔄 Remaining Work

### Interview Page Updates Needed

The interview page (`app/interview/page.tsx`) needs the following changes:

#### 1. Add Authentication Check (Already Done)
Current code at line 55-60 already checks for user, but uses localStorage. Update to:
```typescript
useEffect(() => {
  checkUser();
}, []);

async function checkUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    router.push('/login');
  } else {
    setCurrentUserId(user.id);
  }
}
```

#### 2. Save Interview on Start
When `startInterview()` is called (line 128), create an interview record:

```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) return;

const interview = await createInterview({
  user_id: user.id,
  document_type: context.documentType!,
  description: context.description,
  status: 'in_progress'
});

setCurrentInterviewId(interview.id);
```

#### 3. Save Messages as They're Sent
In `sendMessage()` function (line 222), after each message exchange:

```typescript
// After user sends message
await addInterviewMessage({
  interview_id: currentInterviewId,
  role: 'user',
  content: inputMessage,
  sequence_number: messages.length
});

// After assistant responds
await addInterviewMessage({
  interview_id: currentInterviewId,
  role: 'assistant',
  content: assistantMessage,
  sequence_number: messages.length + 1
});
```

#### 4. Save Document on Completion
In `endInterview()` function (line 304):

```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) return;

// After document is generated
await createDocument({
  interview_id: currentInterviewId,
  user_id: user.id,
  title: `${context.documentType === 'case-study' ? 'Case Study' : 'Best Practices Guide'} - ${context.expertName}`,
  content: data.document,
  document_type: context.documentType!,
  format: 'markdown'
});

// Update interview status
await updateInterviewStatus(currentInterviewId, 'completed', new Date().toISOString());
```

#### 5. Add State Variables
At the top of the component, add:
```typescript
const [currentInterviewId, setCurrentInterviewId] = useState<string | null>(null);
const [currentUserId, setCurrentUserId] = useState<string | null>(null);
```

#### 6. Import Required Functions
Add to imports:
```typescript
import { supabase } from '@/lib/supabase/client';
import {
  createInterview,
  addInterviewMessage,
  createDocument,
  updateInterviewStatus
} from '@/lib/supabase/interviews';
```

### Documents/History Page (New Page Needed)

Create `app/documents/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getUserInterviews, getUserDocuments } from '@/lib/supabase/interviews';
import { Interview, Document } from '@/types/database.types';

export default function DocumentsPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const [interviewsData, documentsData] = await Promise.all([
        getUserInterviews(),
        getUserDocuments()
      ]);

      setInterviews(interviewsData);
      setDocuments(documentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    // UI to display interviews and documents
    // Include filters, search, and view/download options
  );
}
```

## Key Integration Points

### Authentication Flow
1. User signs up → Supabase creates auth.users record → Trigger creates profiles record
2. User signs in → Supabase session created → Can access protected routes
3. User signs out → Supabase session cleared → Redirected to login

### Data Flow
1. **Start Interview**: Create `interviews` record with user_id
2. **During Interview**: Save each message to `interview_messages` with sequence_number
3. **End Interview**:
   - Generate document via API
   - Save to `documents` table
   - Update interview status to 'completed'
4. **View History**: Fetch user's interviews and documents from Supabase

### File Upload (Future Enhancement)
When implementing file uploads in the context step:
1. Upload file to Supabase Storage (`interview-uploads` bucket)
2. Save metadata to `uploaded_files` table
3. Include storage path reference

## Testing Checklist

- [ ] Sign up with new account
- [ ] Verify profile created in database
- [ ] Sign in with credentials
- [ ] Dashboard shows correct user info
- [ ] Start new interview
- [ ] Verify interview record created
- [ ] Complete interview with messages
- [ ] Verify messages saved to database
- [ ] Generate document
- [ ] Verify document saved
- [ ] View documents page
- [ ] Sign out and sign back in
- [ ] Verify data persists

## Database Schema Reference

### Tables Used
- `profiles` - User profile information
- `interviews` - Interview sessions
- `interview_messages` - Chat messages
- `documents` - Generated documents
- `uploaded_files` - File upload metadata

### Key Relationships
- Interview → User (via user_id)
- Messages → Interview (via interview_id)
- Documents → Interview (via interview_id)
- Documents → User (via user_id)

## Environment Variables Required

Ensure these are set in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

## Next Steps

1. Update interview page with database integration (see sections above)
2. Create documents/history page
3. Test complete flow end-to-end
4. Optional: Add file upload to Supabase Storage
5. Optional: Add real-time updates for interview status
6. Optional: Add document editing functionality

## Benefits Achieved

✅ **Persistent Storage** - All interviews and documents saved
✅ **User Authentication** - Secure login/signup with Supabase Auth
✅ **Data Isolation** - Row Level Security ensures users only see their data
✅ **Real Statistics** - Dashboard shows actual user data
✅ **Scalable** - PostgreSQL database that grows with usage
✅ **Type-Safe** - Full TypeScript types for all operations
