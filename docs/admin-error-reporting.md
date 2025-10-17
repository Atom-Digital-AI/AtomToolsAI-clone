# Admin Error Reporting System

## Overview
The admin error reporting system allows admin users to send error details directly from toast notifications to the AI agent for debugging and fixing. This feature automatically appears on all error toasts when the user is an admin.

## How It Works

### For Admin Users
When you see an error toast (red notification), you'll see a "Send to AI" button. Clicking this button:
1. Sends the error title and description to the AI agent
2. Includes contextual information (URL, user agent, timestamp)
3. Stores the report in the `error_reports` table for tracking
4. Shows a confirmation toast when successful

### For Developers

#### Using the Admin Toast Hook
Replace the standard `useToast` import with `useAdminToast`:

```typescript
// Before
import { useToast } from "@/hooks/use-toast";
const { toast } = useToast();

// After
import { useAdminToast } from "@/hooks/use-admin-toast";
const { toast } = useAdminToast();
```

That's it! All error toasts will automatically include the "Send to AI" button for admin users.

#### Example Usage

```typescript
import { useAdminToast } from "@/hooks/use-admin-toast";

function MyComponent() {
  const { toast } = useAdminToast();

  const handleError = () => {
    // This will show "Send to AI" button for admin users
    toast({
      title: "Error",
      description: "Something went wrong",
      variant: "destructive"
    });
  };

  const handleSuccess = () => {
    // Regular success toast (no changes)
    toast({
      title: "Success",
      description: "Operation completed"
    });
  };

  return (
    // ... your component
  );
}
```

#### Manual Admin Error Toast
If you need to use the admin error toast directly (with custom context):

```typescript
import { showAdminErrorToast } from "@/lib/admin-toast";
import { useAuth } from "@/hooks/useAuth";

function MyComponent() {
  const { user } = useAuth();

  const handleError = (error: any) => {
    showAdminErrorToast(
      "Operation Failed",
      error.message,
      user?.isAdmin || false,
      {
        operationType: "data-import",
        recordCount: 150
      }
    );
  };
}
```

## Backend API

### POST /api/error-reports
Stores error reports sent from the frontend.

**Request Body:**
```json
{
  "errorTitle": "Error Title",
  "errorMessage": "Detailed error message",
  "errorContext": {
    "url": "https://...",
    "userAgent": "Mozilla/...",
    "timestamp": "2025-10-17T...",
    "customField": "value"
  }
}
```

**Response:**
```json
{
  "id": "report-uuid",
  "createdAt": "2025-10-17T..."
}
```

## Database Schema

### error_reports Table
```sql
CREATE TABLE error_reports (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  error_title VARCHAR NOT NULL,
  error_message TEXT NOT NULL,
  error_context JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Features
- ✅ Automatic "Send to AI" button on all error toasts for admins
- ✅ Contextual information automatically captured
- ✅ Non-intrusive for non-admin users
- ✅ Drop-in replacement for useToast hook
- ✅ Backend API for error report storage
- ✅ Toast notifications remain fully copy-pasteable
