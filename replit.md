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
- **Content Writer v2 with LangGraph Integration**: A stateful, resumable AI-powered article generation system built on LangGraph 1.0. Features a multi-stage workflow with PostgreSQL-backed checkpointing for resume capability, multi-agent quality control (brand consistency and fact verification), and human approval gates with interrupt mechanism. The workflow includes three generation nodes (concepts, subtopics, article), sequential quality agents that trigger regeneration loops (max 3 attempts) for scores < 70, and two-node approval gates that checkpoint metadata before pausing execution. Supports user preferences for objective, length, tone, language, and target audience. Includes RAG integration using user feedback for continuous improvement, A/B testing for brand style matching, and comprehensive language instruction system with anti-fabrication safeguards. The UI displays quality score badges (color-coded: green ≥80, yellow 70-79, red <70), resume banners for incomplete threads, real-time status polling, and backward compatibility with non-LangGraph sessions. Admin tools include comprehensive thread monitoring with filtering, cancel/delete actions, and LangGraph metrics dashboard showing overall stats (completion rates, avg regeneration), per-node performance (costs/tokens), and quality score averages.
- **Structured Brand Guidelines System**: Allows users to define comprehensive brand profiles (color palettes, target audience, tone of voice) integrated into AI prompts for consistent content generation. Includes an "Auto Populate Brand Guidelines" feature that uses Claude AI to extract guidelines from website URLs, with robust SSRF protection, and intelligent auto-populate dialogs to prevent data loss.
- **Subscription Management**: A tier-based system (Free, Pro, Enterprise) with granular product usage limits and subfeature controls. New users are automatically assigned to the Free tier upon signup.
- **Content Management System (CMS)**: An advanced block-based builder with row/column layouts, drag-and-drop interface, real-time preview, and Google Cloud Storage integration for image uploads.
- **Content History & Feedback**: Comprehensive content lifecycle management with history, search, filtering, and a feedback system (thumbs up/down) integrated with RAG to refine AI outputs.
- **Notifications**: In-app notification system with real-time updates and user-configurable email preferences. Includes article generation status updates.
- **Global Brand Context**: Application-wide brand selection system using React Context API for consistency across tools.
- **AI Analytics Dashboard**: Super admin portal for monitoring AI usage (API calls, tokens, costs) across all tools, with breakdowns by provider and endpoint. Enhanced with LangGraph metrics section showing overall workflow statistics (total threads, completion rate, average regeneration count), per-node performance metrics (costs, tokens, calls by workflow node), and average quality scores (brand consistency, fact verification). Includes admin thread monitoring page with filtering by status/time, thread details dialog, and cancel/delete actions for workflow management.
- **Context Pages Auto-Discovery**: Automatically discovers and categorizes content pages (home, about, services, blog) from a given URL with intelligent early-exit crawling (stops at 250 pages OR when all fields found). Features:
  - **Smart Fallback System**: When 250-page limit is reached without finding services/blogs, shows sequential manual input dialogs
  - **Service Pattern Matching**: Users provide one example service URL; system analyzes structure and finds similar pages from cached crawl
  - **Blog Pagination Crawler**: Extracts blog posts from blog home page URL, follows "next page" links up to 5 pages to collect 20 articles
  - **4-Step About Page Discovery**: Intelligent fallback logic for about page detection
  - **Re-extraction Protection**: Prevents accidental overwrites during re-extraction with confirmation dialogs

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