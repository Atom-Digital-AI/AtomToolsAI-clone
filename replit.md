# atomtools.ai

## Overview

This is a dark-mode marketing website and comprehensive subscription-based application for atomtools.ai, a platform selling digital marketing and automation tools. The application features a complete subscription system with product access control, allowing users to subscribe to different marketing tools and restricting access based on active subscriptions. Built as a full-stack web application with React frontend, Express backend, and PostgreSQL database, it includes modern UI/UX with focus on marketing automation including connectors, generators, and reporting helpers for digital marketers, agencies, and small businesses.

## Recent Changes (August 2025)

- **Session Authentication Fixed**: Resolved session cookie naming mismatch between frontend ("atomtools.sid") and backend ("connect.sid") that was causing authentication failures across the application.
- **Navigation Issues Resolved**: Fixed My Tools → Access Tool → My Tools navigation loop by correcting product route paths from marketing pages (/tools/) to app tool pages (/app/tools/).
- **Subscription Management**: Enhanced account page with full subscription management functionality, allowing users to view active subscriptions and available products.
- **Database Schema Updates**: Updated product route paths to point to authenticated app tools rather than public marketing pages for proper access control.
- **Facebook Ads Connector Repositioning**: Updated Facebook Ads Looker Studio Connector from software service to educational guide (£499 one-time fee) emphasizing no monthly subscriptions, no data storage costs, and full user control versus black box middleware.
- **Exact Original Python Logic Successfully Implemented (August 2025)**: Preserved the authentic generation methodology from the original Python Ad Copy Generator App while maintaining enhanced UI:
  - **Backend API Endpoints**: Implemented exact prompts, examples, and OpenAI API calls from original Python app (gpt-4o model, identical temperature settings, same language detection and URL fetching logic)
  - **SEO Meta Generator**: Authentic API endpoint mirrors original Python logic exactly - same prompts, character limits, JSON parsing, and language detection
  - **Google Ads Copy Generator**: Authentic API endpoint preserves original methodology with correct format - **3 headlines and 2 descriptions** using headlines/descriptions arrays format
  - **Correct Format Confirmed Working**: Google Ads generator now outputs exact original format: `{"headlines": ["H1", "H2", "H3"], "descriptions": ["D1", "D2"]}` matching original PHP processing expectations
  - **Frontend Integration**: Both tools successfully use authentic backend APIs with real OpenAI responses while maintaining enhanced UI/UX features like progress tracking, character count validation, and export functionality
  - **Bulk Results UI Enhancement**: Converted bulk campaign results from large blocks to compact table format for improved space efficiency and readability
- **Grammar and Formatting Rules**: Removed uppercase text option and implemented intelligent formatting with 70% character limit optimization, proper country abbreviations (UK, US, EU), and smart keyword/brand inclusion logic
- **Smart Keyword Logic**: Updated prompts to include main keyword if it fits, otherwise use complete brand name; for keywords use complete phrase if possible, otherwise grammatically correct shorter version
- **Quality Control Enhancement**: Added negative prompts (EM-Dashes, Partial brand names, poor grammar) and logical validation instructions to ensure high-quality output that meets professional standards
- **OpenAI Integration**: Fully operational with user's API key using gpt-4o-mini model and parameters from original Python implementation
- **Compliance Guidelines Support (August 2025)**: Enhanced both Google Ads Copy Generator and SEO Meta Generator tools with critical compliance features:
  - **Brand Guidelines Field**: Optional brand guidelines input that becomes critical compliance factor in AI prompts
  - **Regulatory Guidelines Field**: Optional regulatory compliance input for meeting industry-specific requirements
  - **Critical Pre-Output Review**: Added 4-point compliance checklist in prompts ensuring brand/regulatory guidelines are strictly followed before content generation
  - **Bulk Processing Compliance**: Extended guidelines support to bulk CSV processing for consistent compliance across all generated content
  - **Professional Quality Control**: Removed scoring badges and character warnings for cleaner output displays, focusing purely on content quality and compliance

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **UI Library**: Shadcn/ui components with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom dark-mode design tokens matching the atomtools.ai brand
- **State Management**: React Query for server state management
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Typography**: Inter for UI text, Space Grotesk for headlines via Google Fonts

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Structure**: RESTful endpoints under `/api` prefix
- **Session Storage**: PostgreSQL-based session storage using connect-pg-simple
- **Development**: Hot module replacement via Vite integration in development mode

### Database Schema
The application uses PostgreSQL with a comprehensive subscription system:
- **Users**: Stores user accounts with username, email, password, and timestamps
- **Products**: Stores available tools with name, description, price, route path, and active status
- **User Subscriptions**: Junction table managing user-product relationships with subscription status
- **Contacts**: Stores contact form submissions with name, email, message, and timestamps
- **Sessions**: Stores user session data for authentication persistence
- **Schema Management**: Drizzle Kit for migrations with TypeScript schema definitions and relations

### Authentication & Security
- **User Registration**: Basic username/email/password signup with validation
- **Session Management**: Server-side sessions stored in PostgreSQL
- **Input Validation**: Zod schemas for both client and server-side validation
- **CORS**: Configured for cross-origin requests in development

### UI/UX Design System
- **Color Scheme**: Custom dark-mode palette with electric indigo accent (#6366F1)
- **Accessibility**: WCAG 2.2 AA compliant components with proper ARIA labels
- **Responsive Design**: Mobile-first approach with breakpoint-based layouts
- **Typography Scale**: Tailwind's default spacing with custom font stacks
- **Component Architecture**: Atomic design with reusable UI primitives

### Performance Optimizations
- **Code Splitting**: Vite-based bundling with tree shaking
- **Pricing Model**: Free to start, pay-once-own-forever for individual tools
- **No Google Analytics**: Uses privacy-focused analytics only
- **Font Loading**: Preconnected Google Fonts with fallback stacks
- **Image Optimization**: Lazy loading and responsive images
- **SEO**: Meta tags, structured data (JSON-LD), and semantic HTML

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database queries and schema management

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Headless UI primitives for accessibility
- **Lucide React**: Icon library for consistent iconography
- **Google Fonts**: Web font delivery for Inter and Space Grotesk

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type checking and enhanced developer experience
- **ESBuild**: Fast JavaScript bundler for production builds
- **TSX**: TypeScript execution for development server

### Form & Validation
- **React Hook Form**: Form state management and validation
- **Zod**: Schema validation for type safety
- **Hookform Resolvers**: Integration between React Hook Form and Zod

### Utility Libraries
- **Date-fns**: Date manipulation and formatting
- **Class Variance Authority**: Utility for creating variant-based component APIs
- **CLSX & Tailwind Merge**: Conditional class name composition

### Development & Replit Integration
- **Replit Vite Plugins**: Runtime error overlay and cartographer for Replit-specific features
- **Connect-PG-Simple**: PostgreSQL session store for Express sessions