# atomtools.ai

## Overview
atomtools.ai is a subscription-based web platform providing digital marketing and automation tools. It targets digital marketers, agencies, and small businesses with features like connectors, generators, and reporting helpers, all focused on marketing automation. The platform includes a dark-mode marketing website and a comprehensive application with a full subscription system to manage access to tools. The business vision is to empower digital marketers with AI-driven tools, offering market potential in efficiency gains and creative output, ultimately aiming to be a leading platform in marketing automation.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Design
The platform uses React 18 with TypeScript, Vite, and Wouter for routing. UI components are built with Shadcn/ui and Radix UI primitives, styled using Tailwind CSS with a custom dark-mode palette and electric indigo accent. Typography uses Inter for UI text and Space Grotesk for headlines. The design is responsive, mobile-first, and follows WCAG 2.2 AA accessibility standards. An admin panel provides CRUD operations for managing packages, products, and users. Key UI/UX decisions include a consistent dark-mode theme, intuitive navigation, and user-friendly forms with intelligent auto-population and validation.

### Backend and Database
The backend is built with Node.js and Express.js. Data is managed using Drizzle ORM with a PostgreSQL dialect, hosted on Neon Database. Authentication supports email/password only, with server-side sessions stored in PostgreSQL. Zod schemas are used for input validation on both client and server sides. A global error handling middleware automatically logs errors with context and allows admin users to report them to an AI agent for debugging.

### Core Features
- **Marketing Tools**: AI-powered generators for Ad Copy (Google Ads, SEO Meta) leveraging OpenAI.
- **Content Writer v2**: A multi-stage AI-powered article generation system including concept generation, subtopic suggestions, and comprehensive article assembly. It supports user preferences for objective, length, tone, language, and target audience, with RAG integration using user feedback for continuous improvement. Features include A/B testing for brand style matching (continuous vs. end-rewrite) and a comprehensive language instruction system with anti-fabrication safeguards.
- **Structured Brand Guidelines System**: Allows users to define comprehensive brand profiles (color palettes, target audience, tone of voice) integrated into AI prompts for consistent content generation. Includes an "Auto Populate Brand Guidelines" feature that uses Claude AI to extract guidelines from website URLs, with robust SSRF protection, and intelligent auto-populate dialogs to prevent data loss.
- **Subscription Management**: A tier-based system (Free, Pro, Enterprise) with granular product usage limits and subfeature controls. New users are automatically assigned to the Free tier upon signup.
- **Content Management System (CMS)**: An advanced block-based builder with row/column layouts, drag-and-drop interface, real-time preview, and Google Cloud Storage integration for image uploads.
- **Content History & Feedback**: Comprehensive content lifecycle management with history, search, filtering, and a feedback system (thumbs up/down) integrated with RAG to refine AI outputs.
- **Notifications**: In-app notification system with real-time updates and user-configurable email preferences. Includes article generation status updates.
- **Global Brand Context**: Application-wide brand selection system using React Context API for consistency across tools.
- **AI Analytics Dashboard**: Super admin portal for monitoring AI usage (API calls, tokens, costs) across all tools, with breakdowns by provider and endpoint.
- **Context Pages Auto-Discovery**: Automatically discovers and categorizes content pages (home, about, services, blog) from a given URL, allowing users to review and approve pages before content extraction. Features intelligent 4-step fallback logic for about page detection and prevents accidental overwrites during re-extraction.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database queries.

### AI/API Services
- **OpenAI API**: For AI content generation.
- **Anthropic Claude AI**: For the "Auto Populate Brand Guidelines" feature.

### Cloud Storage
- **Google Cloud Storage**: For image uploads in the CMS.

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework.
- **Radix UI**: Headless UI primitives.
- **Lucide React**: Icon library.

### Development Tools
- **Vite**: Build tool and development server.
- **TypeScript**: Type checking.
- **Zod**: Schema validation.