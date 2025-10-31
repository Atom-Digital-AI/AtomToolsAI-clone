# Social Content Generator - Setup Guide

## ? Complete Implementation

All components for the Social Content Generator have been built and are ready to use.

## ?? What Was Built

### **Backend (Server)**

1. **Database Schema** (`/workspace/shared/schema.ts`)
   - `adSpecs` - Stores 49 ad format specifications across 5 platforms
   - `socialContentSessions` - Manages user sessions
   - `socialContentWireframes` - Stores generated wireframe options
   - Added `SOCIAL_CONTENT_GENERATOR` to `PRODUCT_IDS`
   - Added `'social-content'` to `TOOL_TYPES`

2. **LangGraph Workflow** (`/workspace/server/langgraph/`)
   - `social-content-types.ts` - State types and validation
   - `social-content-graph.ts` - Main workflow orchestration
   - **Nodes:**
     - `scrapeUrls.ts` - Extracts content from provided URLs
     - `generateWireframes.ts` - Creates 3 options (A/B/C) per format
     - `awaitApproval.ts` - Pauses for user review
     - `handleApproval.ts` - Processes approved wireframes

3. **Validation** (`/workspace/server/utils/`)
   - `ad-spec-validator.ts` - Character limits, CTA validation, media specs
   - `social-content-access.ts` - Tier-based platform access control

4. **API Routes** (`/workspace/server/social-content-routes.ts`)
   - `GET /api/social-content/ad-specs` - Get available formats
   - `POST /api/social-content/start` - Start new session
   - `GET /api/social-content/sessions/:id` - Get session state
   - `POST /api/social-content/sessions/:id/approve` - Approve wireframes
   - `GET /api/social-content/sessions` - List user sessions

5. **Ad Spec Seed Data** (`/workspace/server/seed-ad-specs.ts`)
   - 49 formats across Facebook, Instagram, TikTok, X, YouTube
   - Run with: `npx tsx server/seed-ad-specs.ts`

### **Frontend (Client)**

1. **Main UI** (`/workspace/client/src/pages/app/tools/social-content-generator.tsx`)
   - 3-stage workflow: Intake ? Wireframes ? Completion
   - Platform & format selection with visual previews
   - Real-time character count validation (green/yellow/red)
   - Brand guidelines integration
   - Wireframe comparison with A/B/C options

2. **Export Component** (`/workspace/client/src/components/SocialContentExport.tsx`)
   - Copy-to-clipboard for individual fields
   - Bulk download: JSON, CSV, TXT formats
   - 16 wireframes ? 16 downloads (platform ? format)

3. **Access Control**
   - Integrates with `AccessGuard` component
   - Checks tier permissions before allowing generation

### **Tests** (`/workspace/server/__tests__/`)

1. `ad-spec-validator.test.ts` - 15 validation tests
2. `social-content-types.test.ts` - 8 type/grouping tests
3. Run with: `npx tsx server/__tests__/[filename]`

---

## ?? Setup Instructions (Replit-Compatible)

### **1. Database Migration**

Since `drizzle-kit` may not be installed globally on Replit, manually run the seed script after ensuring your database is accessible:

```bash
# Option A: If drizzle-kit works
npx drizzle-kit push

# Option B: The tables are defined in schema.ts and will be created on first app start
# Just run the seed script after the app initializes
npx tsx server/seed-ad-specs.ts
```

### **2. Environment Variables**

Ensure these are set in Replit secrets:

```bash
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...  # For embeddings
```

### **3. Run Seed Script**

After database is ready:

```bash
npx tsx server/seed-ad-specs.ts
```

You should see:
```
Seeding ad specs...
? Successfully seeded 49 ad specs
```

### **4. Create Product & Tier**

You'll need to create the Social Content Generator product in your admin panel with:

- **Product ID:** `7a3c8f1e-9b2d-4e6a-8f7c-1d2e3f4a5b6c`
- **Name:** Social Content Generator
- **Route Path:** `/app/tools/social-content-generator`

**Tier Subfeatures:**
```json
{
  "platforms": ["Facebook", "Instagram", "TikTok", "X (Twitter)", "YouTube"],
  "brand_guidelines": true,
  "variations": true,
  "max_formats_per_platform": 10
}
```

### **5. Start the App**

```bash
npm run dev
```

Navigate to: `/app/tools/social-content-generator`

---

## ?? User Flow

1. **Intake**
   - Enter subject (e.g., "Summer sale on outdoor furniture")
   - Optional: Add objective, source URLs
   - Select brand profile (if using guidelines)

2. **Select Platforms & Formats**
   - Choose platforms: Facebook, Instagram, TikTok, X, YouTube
   - Pick specific formats per platform (e.g., Feed Image Ad, Stories)

3. **Generate**
   - Backend scrapes URLs (if provided)
   - Claude generates 3 wireframe options (A/B/C) per format
   - Each includes:
     - Text fields with character counts
     - CTA button selection
     - Media concept description
     - Technical specs
     - Compliance checks

4. **Review & Approve**
   - User sees all wireframes grouped by platform/format
   - Click to select favorite option per format
   - Real-time validation shows character limits (green/yellow/red)
   - Brand alignment score displayed

5. **Export**
   - Approved wireframes saved to content library
   - Download as JSON, CSV, or TXT
   - Copy individual text fields to clipboard
   - One wireframe per platform?format combination

---

## ?? Key Files Reference

```
/workspace/
??? shared/
?   ??? schema.ts                                 # DB schema with new tables
??? server/
?   ??? seed-ad-specs.ts                          # Seed 49 ad formats
?   ??? social-content-routes.ts                  # API endpoints
?   ??? langgraph/
?   ?   ??? social-content-graph.ts               # LangGraph workflow
?   ?   ??? social-content-types.ts               # State types
?   ?   ??? social-content-nodes/
?   ?       ??? scrapeUrls.ts                     # URL scraping node
?   ?       ??? generateWireframes.ts             # Wireframe generation
?   ?       ??? awaitApproval.ts                  # Human-in-the-loop
?   ?       ??? handleApproval.ts                 # Finalize session
?   ??? utils/
?   ?   ??? ad-spec-validator.ts                  # Validation utilities
?   ?   ??? social-content-access.ts              # Access control
?   ??? __tests__/
?       ??? ad-spec-validator.test.ts             # Validation tests
?       ??? social-content-types.test.ts          # Type tests
??? client/src/
    ??? pages/app/tools/
    ?   ??? social-content-generator.tsx          # Main UI
    ??? components/
        ??? SocialContentExport.tsx               # Export component
```

---

## ?? Testing

Run validation tests:

```bash
# Test ad spec validator
npx tsx server/__tests__/ad-spec-validator.test.ts

# Test social content types
npx tsx server/__tests__/social-content-types.test.ts
```

Expected output:
```
=== Ad Spec Validator Tests ===
? Text under limit should pass
? Text over limit should fail
... (15 tests)

=== Test Summary ===
Total: 15
Passed: 15
Failed: 0

? All tests passed!
```

---

## ?? Tier Configuration Examples

### **Free Tier**
```json
{
  "platforms": ["Facebook", "Instagram"],
  "brand_guidelines": false,
  "variations": false,
  "max_formats_per_platform": 2
}
```

### **Pro Tier**
```json
{
  "platforms": ["Facebook", "Instagram", "TikTok", "X (Twitter)"],
  "brand_guidelines": true,
  "variations": true,
  "max_formats_per_platform": 5
}
```

### **Enterprise Tier**
```json
{
  "platforms": ["Facebook", "Instagram", "TikTok", "X (Twitter)", "YouTube"],
  "brand_guidelines": true,
  "variations": true,
  "max_formats_per_platform": 10
}
```

---

## ?? Common Issues & Fixes

### **Issue:** `drizzle-kit: not found`
**Fix:** Tables are auto-created from schema on first app start. Just run seed script after.

### **Issue:** No ad specs in database
**Fix:** Run: `npx tsx server/seed-ad-specs.ts`

### **Issue:** 403 Access Denied
**Fix:** Ensure user has active subscription to Social Content Generator product

### **Issue:** Wireframes not generating
**Fix:** Check `ANTHROPIC_API_KEY` is set and has sufficient credits

### **Issue:** Brand guidelines not loading
**Fix:** Ensure user has selected a brand profile and tier allows `brand_guidelines`

---

## ? Features Summary

- ? **49 Ad Formats** across 5 platforms
- ? **Multi-stage Workflow** with human approval
- ? **Brand Guidelines** integration via RAG
- ? **URL Scraping** for content extraction
- ? **Real-time Validation** (character limits, CTAs, media specs)
- ? **3 Wireframe Options** per format (A/B/C)
- ? **Bulk Export** (JSON, CSV, TXT)
- ? **Tier-based Access** control
- ? **LangGraph Workflow** with checkpoints
- ? **Compliance Checks** for each format
- ? **Brand Alignment Scores**

---

## ?? Next Steps (Future Enhancements)

1. **Media Generation**
   - Integrate DALL-E 3 for image generation
   - Connect video generation service
   - Actual file outputs instead of descriptions

2. **Platform APIs**
   - Direct posting to Facebook, Instagram, etc.
   - Campaign management
   - Performance tracking

3. **Advanced Features**
   - A/B testing recommendations
   - Historical performance data
   - Multi-language support
   - Scheduling & calendar integration

---

## ?? You're All Set!

The Social Content Generator is fully functional and ready to create platform-compliant social media content with brand guidelines.

**Test it:** Navigate to `/app/tools/social-content-generator` in your app!
