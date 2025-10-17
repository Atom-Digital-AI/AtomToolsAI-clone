# atomtools.ai

## Overview
atomtools.ai is a subscription-based web platform providing digital marketing and automation tools. It targets digital marketers, agencies, and small businesses with features like connectors, generators, and reporting helpers, all focused on marketing automation. The platform includes a dark-mode marketing website and a comprehensive application with a full subscription system to manage access to tools.

## Recent Changes (October 2025)
- **Duplicate Functionality**: Added duplicate buttons for both brand profiles and target audiences to streamline content creation. Brand profiles can be duplicated with one click, creating a copy with " (Copy)" appended to the name. Target audiences within brand guidelines can also be duplicated, with deep cloning ensuring all nested arrays (interests, keywords) and objects (age_range) are independent copies, preventing shared references when editing (October 17, 2025)
- **Content Writer v2 Language & Style Enhancements**: Implemented comprehensive language instruction system with `language-helpers.ts` utility that converts language codes (en-GB, en-US, etc.) into explicit AI instructions with proper spelling variants (British English uses UK spelling, American English uses US spelling). Added web article style instructions emphasizing clear, engaging, scannable content (NOT academic). All Content Writer v2 prompts now include anti-fabrication safeguards prohibiting invented statistics, case studies, quotes, or data. Removed target audience display from final article output. Added HTML/Markdown toggle to content display page. Added target geography field to Target Audience Profile with full Zod schema validation for better geographical targeting (October 17, 2025)
- **Context Pages Auto-Discover Improvements**: Enhanced page categorization with two-pass approach prioritizing exact URL patterns (/about, /about-us) for about page detection. Blog article detection now excludes index/category pages (/blog, /category/, /tag/). Service pages limit increased from 5 to 10. Added extraction status display showing existing extracted content with page count and date. Warning dialog prevents accidental overwrites when re-extracting content. API endpoint added to fetch existing extracted context (October 17, 2025)
- **Brand Guidelines UX Improvements**: Enhanced brand guidelines form with improved visual hierarchy and smart auto-populate. Domain URL field moved outside tabs for global access. All sections now have distinct visual containers (border-2, enhanced backgrounds, better spacing) for clear separation. Added intelligent auto-populate dialog that detects existing data and offers "Fill Empty Only" or "Overwrite All" options, preventing accidental data loss. Merge logic preserves existing values when using fill-empty mode (October 17, 2025)
- **SSL Certificate Handling**: Fixed web crawler HTTPS agent configuration to properly handle sites with invalid SSL certificates using rejectUnauthorized: false (October 17, 2025)
- **Admin Error Reporting System**: Implemented admin-only error reporting feature allowing admins to send errors directly from toast notifications to the AI agent. Includes database table for error reports, backend API endpoints, and frontend utility (`showAdminErrorToast`) that adds a "Send to AI" button to error toasts. Error reports include context (URL, timestamp, user agent) for debugging. Toast notifications remain fully copy-pasteable with select-text CSS (October 17, 2025)
- **Auto-Populate Bug Fix**: Fixed critical bug where auto-populate brand guidelines features (both URL and PDF) were failing with "userId is not defined" error. Properly extracted userId from req.user.id in both /api/guideline-profiles/auto-populate and /api/guideline-profiles/auto-populate-pdf endpoints (October 17, 2025)
- **Context Pages Auto-Discovery**: Implemented auto-discovery feature for brand context pages. Users enter homepage URL, system crawls up to 30 pages and automatically categorizes them into home, about, services (up to 5), and blog articles (up to 20). Discovered URLs auto-populate for user review/editing before extraction. Keywords-based categorization uses URL patterns and page titles. Feature prevents auto-extraction, requiring explicit user approval (October 17, 2025)
- **Content Writer v2 Style Matching**: Added dynamic style-matching feature to Content Writer v2. Users can now toggle "Match brand's writing style and tone" when brand guidelines are selected. Feature applies to all Content Writer stages: concept generation, regeneration, subtopics, additional subtopics, and final article generation. Backend properly passes query parameter and matchStyle option to RAG service (October 17, 2025)
- **Google OAuth Removal**: Completely removed Google OAuth authentication from the entire application. Now supports email/password authentication only. Removed Google login/signup buttons from homepage, login page, and signup page. Removed OAuth routes, storage methods, and disabled oauth.ts module (October 17, 2025)
- **AI Analytics Module**: Added comprehensive AI usage analytics for super admin portal showing total API calls, tokens, costs, and breakdowns by provider and endpoint (October 17, 2025)
- **Content Writer v2 Bug Fix**: Fixed RAG service type mismatch preventing Content Writer v2 usage from being logged to ai_usage_logs table. Updated tool type validation to accept 'content-writer' alongside 'seo-meta' and 'google-ads' (October 17, 2025)
- **Centralized Tool Types**: Refactored hardcoded tool type strings to use centralized `ToolType` definition in shared/schema.ts. Ensures single source of truth for all tool types across the application (October 17, 2025)

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Design
The platform uses React 18 with TypeScript, Vite, and Wouter for routing. UI components are built with Shadcn/ui and Radix UI primitives, styled using Tailwind CSS with a custom dark-mode palette and electric indigo accent. Typography uses Inter for UI text and Space Grotesk for headlines. The design is responsive, mobile-first, and follows WCAG 2.2 AA accessibility standards. An admin panel provides CRUD operations for managing packages, products, and users.

### Backend and Database
The backend is built with Node.js and Express.js. Data is managed using Drizzle ORM with a PostgreSQL dialect, hosted on Neon Database. Authentication supports email/password only, with server-side sessions stored in PostgreSQL. Zod schemas are used for input validation on both client and server sides.

### Core Features
- **Marketing Tools**: AI-powered generators for Ad Copy (Google Ads, SEO Meta) leveraging OpenAI.
- **Content Writer v2**: A multi-stage AI-powered article generation system. It includes topic input, brand guideline selection, AI-generated concepts, subtopic suggestions, and comprehensive article assembly. It supports user preferences for objective, length, tone, language, and target audience, with RAG integration using user feedback for continuous improvement.
- **Structured Brand Guidelines System**: Allows users to define and save comprehensive brand profiles in a structured JSON format (color palettes, target audience, tone of voice, etc.). These guidelines are integrated into AI prompts for consistent content generation. A key feature is "Auto Populate Brand Guidelines," which uses Claude AI to extract guidelines from a website URL, with robust SSRF protection.
- **Subscription Management**: A pure tier-based system (Free, Pro, Enterprise) replacing individual product subscriptions. It offers granular product usage limits, subfeature controls, and usage tracking.
- **Content Management System (CMS)**: An advanced block-based builder with row/column layouts, drag-and-drop interface, real-time preview, and Google Cloud Storage integration for image uploads.
- **Content History & Feedback**: Comprehensive content lifecycle management with history, search, and filtering. Includes a feedback system (thumbs up/down) integrated with RAG to refine AI outputs based on user preferences.
- **Notifications**: In-app notification system with real-time updates and user-configurable email preferences for article completion and system messages.
- **Global Brand Context**: An application-wide brand selection system using React Context API, ensuring brand consistency across all tools and forms.
- **AI Analytics Dashboard**: Super admin portal for monitoring AI usage across all tools. Displays total API calls, token consumption, estimated costs, and breakdowns by provider (OpenAI/Anthropic) and endpoint. Accessible at /admin/ai-analytics with date range filtering.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database queries.

### AI/API Services
- **OpenAI API**: For AI content generation.
- **Anthropic Claude AI**: For the "Auto Populate Brand Guidelines" feature.

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework.
- **Radix UI**: Headless UI primitives.
- **Lucide React**: Icon library.

### Development Tools
- **Vite**: Build tool and development server.
- **TypeScript**: Type checking.
- **Zod**: Schema validation.