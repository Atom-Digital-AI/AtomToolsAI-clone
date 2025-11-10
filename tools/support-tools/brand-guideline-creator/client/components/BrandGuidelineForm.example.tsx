// INTEGRATION EXAMPLE - How to use BrandGuidelineForm in profile settings
// This file shows how to replace the existing textarea with the BrandGuidelineForm

import BrandGuidelineForm from "@/components/BrandGuidelineForm";
import { BrandGuidelineContent } from "@shared/schema";

// Example: In the Create Profile Dialog (replace the textarea)
// OLD:
/*
<Textarea
  id="profile-content"
  value={newProfile.content}
  onChange={(e) => setNewProfile({ ...newProfile, content: e.target.value })}
  placeholder="Enter your guidelines..."
/>
*/

// NEW (for Brand profiles only):
/*
{newProfile.type === "brand" ? (
  <BrandGuidelineForm
    value={newProfile.content}
    onChange={(content: BrandGuidelineContent) => 
      setNewProfile({ ...newProfile, content })
    }
  />
) : (
  <Textarea
    id="profile-content"
    value={typeof newProfile.content === 'string' ? newProfile.content : ''}
    onChange={(e) => setNewProfile({ ...newProfile, content: e.target.value })}
    placeholder="Enter your guidelines..."
  />
)}
*/

// Example: In the Edit Profile Dialog
// OLD:
/*
<Textarea
  value={editingProfile.content}
  onChange={(e) => setEditingProfile({ ...editingProfile, content: e.target.value })}
/>
*/

// NEW (for Brand profiles only):
/*
{editingProfile.type === "brand" ? (
  <BrandGuidelineForm
    value={editingProfile.content}
    onChange={(content: BrandGuidelineContent) => 
      setEditingProfile({ ...editingProfile, content })
    }
  />
) : (
  <Textarea
    value={typeof editingProfile.content === 'string' ? editingProfile.content : ''}
    onChange={(e) => setEditingProfile({ ...editingProfile, content: e.target.value })}
  />
)}
*/

// The component automatically:
// 1. Detects legacy text format and shows migration UI
// 2. Validates input using brandGuidelineContentSchema
// 3. Provides structured tabs for different guideline sections
// 4. Handles all array operations (add/remove colors, audiences)
// 5. Converts comma-separated tags to arrays automatically
