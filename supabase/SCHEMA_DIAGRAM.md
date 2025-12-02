# Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE AUTH (Built-in)                        │
│                                                                         │
│  auth.users                                                             │
│  ├── id (uuid)                                                          │
│  ├── email                                                              │
│  └── ...                                                                │
└────────────┬────────────────────────────────────────────────────────────┘
             │
             │ (trigger: on_auth_user_created)
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  profiles (extends auth.users)                                          │
│  ├── id (uuid) ─────────► references auth.users(id)                    │
│  ├── email                                                              │
│  ├── full_name                                                          │
│  ├── company                                                            │
│  ├── role                                                               │
│  ├── years_of_experience                                               │
│  ├── created_at                                                         │
│  └── updated_at                                                         │
└────────────┬────────────────────────────────────────────────────────────┘
             │
             │ (user_id)
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  interviews                                                             │
│  ├── id (uuid, PK)                                                      │
│  ├── user_id ───────────► references profiles(id)                      │
│  │                        (expert info comes from profile)             │
│  ├── document_type ('case-study' | 'best-practices')                  │
│  ├── description                                                        │
│  ├── status ('in_progress' | 'completed' | 'draft')                   │
│  ├── started_at                                                         │
│  ├── completed_at                                                       │
│  ├── created_at                                                         │
│  └── updated_at                                                         │
└────────────┬────────────────────────────────────────────────────────────┘
             │
             ├────────────────────┬────────────────────┬────────────────┐
             │                    │                    │                │
             ▼                    ▼                    ▼                ▼
┌──────────────────────┐ ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
│ interview_messages   │ │   documents     │ │ uploaded_files│ │              │
│ ├── id (uuid, PK)    │ │ ├── id (PK)     │ │ ├── id (PK)   │ │ Relationships│
│ ├── interview_id ────┼─┤ │ ├── interview_id│ │ ├── interview│ │              │
│ ├── role             │ │ │ ├── user_id ────┼─┤ ├── user_id ─┤ │ - CASCADE    │
│ ├── content          │ │ │ ├── title       │ │ ├── file_name │ │   on delete  │
│ ├── sequence_number  │ │ │ ├── content     │ │ ├── file_type │ │              │
│ └── created_at       │ │ │ ├── doc_type    │ │ ├── file_size │ │ - Ordered    │
│                      │ │ │ ├── format      │ │ ├── storage_  │ │   queries    │
│ Stores each message  │ │ │ ├── file_url    │ │ │   path       │ │              │
│ in the interview     │ │ │ ├── created_at  │ │ └── uploaded_ │ │ - Indexed    │
│ conversation         │ │ │ └── updated_at  │ │     at        │ │   lookups    │
└──────────────────────┘ │                   │ │               │ │              │
                         │ Final generated   │ │ Metadata for  │ │              │
                         │ documentation     │ │ user uploads  │ │              │
                         └───────────────────┘ └───────────────┘ └──────────────┘
```

## Data Flow

### 1. User Signup
```
User signs up
    ↓
auth.users record created
    ↓
Trigger: on_auth_user_created fires
    ↓
profiles record auto-created
```

### 2. Interview Creation
```
User starts interview
    ↓
interviews record created (status: 'in_progress')
    ↓
Optional: uploaded_files records created
    ↓
interview_messages records created (each Q&A)
    ↓
Interview completed (status: 'completed')
    ↓
documents record created with final output
```

### 3. Data Retrieval
```
Dashboard loads
    ↓
Query: Get user's interviews
    ↓
Query: Get user statistics
    ↓
Display interview history and stats
```

### 4. Interview Resume/View
```
User selects past interview
    ↓
Query: Get interview with messages
    ↓
Display full conversation
    ↓
Query: Get associated document
    ↓
Display generated document
```

## Row Level Security (RLS) Summary

All tables have RLS enabled with the following pattern:

```
profiles:
  ✓ Users can view/update their own profile

interviews:
  ✓ Users can CRUD their own interviews

interview_messages:
  ✓ Users can view/create messages in their interviews

documents:
  ✓ Users can CRUD their own documents

uploaded_files:
  ✓ Users can CRUD their own files
```

## Indexes for Performance

```sql
-- Fast user lookup
idx_interviews_user_id ON interviews(user_id)

-- Status filtering
idx_interviews_status ON interviews(status)

-- Message retrieval
idx_interview_messages_interview_id ON interview_messages(interview_id)
idx_interview_messages_sequence ON interview_messages(interview_id, sequence_number)

-- Document lookup
idx_documents_user_id ON documents(user_id)
idx_documents_interview_id ON documents(interview_id)

-- File lookup
idx_uploaded_files_interview_id ON uploaded_files(interview_id)
```

## Storage Buckets

```
interview-uploads/
  └── {user_id}/
      ├── {interview_id}/
      │   ├── file1.pdf
      │   ├── file2.docx
      │   └── ...

generated-documents/
  └── {user_id}/
      ├── {document_id}.pdf
      └── ...
```

## Key Features

1. **Automatic Profile Creation**: When a user signs up, their profile is automatically created
2. **Cascading Deletes**: Deleting an interview removes all related data
3. **Optimized Queries**: Indexes on frequently queried columns
4. **Data Isolation**: RLS ensures users only see their own data
5. **Audit Trail**: created_at and updated_at timestamps on all tables
6. **Message Ordering**: sequence_number ensures correct conversation order
