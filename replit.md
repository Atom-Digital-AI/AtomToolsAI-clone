# atomtools.ai

## Overview
atomtools.ai is a platform offering digital marketing and automation tools through a subscription-based web application. It features a dark-mode marketing website and a comprehensive application with a full subscription system, enabling restricted access to tools based on active subscriptions. The platform aims to provide connectors, generators, and reporting helpers for digital marketers, agencies, and small businesses, focusing on marketing automation.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite.
- **Routing**: Wouter.
- **UI Library**: Shadcn/ui components with Radix UI primitives.
- **Styling**: Tailwind CSS with custom dark-mode design tokens.
- **State Management**: React Query.
- **Forms**: React Hook Form with Zod validation.
- **Typography**: Inter (UI text), Space Grotesk (headlines).

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Database ORM**: Drizzle ORM with PostgreSQL dialect.
- **Database Provider**: Neon Database (serverless PostgreSQL).
- **API Structure**: RESTful endpoints under `/api`.
- **Session Storage**: PostgreSQL-based session storage using connect-pg-simple.

### Database Schema
A PostgreSQL database with a pure tier-based subscription system:
- **Users**: User accounts, Google OAuth integration (stores google_id, profile_image_url).
- **Products**: Available marketing tools (optimized: removed redundant package_id column).
- **User Tier Subscriptions**: Pure tier-based subscription system with usage tracking and limits management.
- **Contacts**: Contact form submissions.
- **Sessions**: User session data.
- **Guideline Profiles**: Stores saved brand and regulatory guideline profiles for tools.
- **CMS Pages**: Content management system pages with SEO metadata, publishing workflow, and rich content support.
- **CMS Navigation**: Navigation structure for CMS content organization.
- **Packages, Tiers, Tier Prices, Tier Limits, Package Products**: Comprehensive tier-based package system supporting flexible pricing, product assignment, and usage limits (e.g., quantity restrictions, periodicity, subfeature toggles).
- **Schema Management**: Drizzle Kit for migrations.
- **Database Optimization**: Removed redundant constraints, unused columns, and legacy individual subscription handling (August 2025).

### Authentication & Security
- **Authentication**: Google OAuth 2.0 and traditional email/password signup.
- **Session Management**: Server-side sessions in PostgreSQL.
- **Input Validation**: Zod schemas for client and server-side validation.

### UI/UX Design System
- **Color Scheme**: Custom dark-mode palette with electric indigo accent (#6366F1).
- **Accessibility**: WCAG 2.2 AA compliant components.
- **Responsive Design**: Mobile-first approach.
- **Component Architecture**: Atomic design principles.
- **Admin Panel**: Comprehensive admin dashboard for managing packages, products, and users with full CRUD operations.

### Key Features and Technical Implementations
- **Marketing Tools**: Includes Ad Copy Generators (Google Ads, SEO Meta) mirroring original Python logic (prompts, OpenAI model, temperature, language detection).
- **Compliance Guidelines Support**: Optional brand and regulatory guidelines input in AI prompts with pre-output review.
- **Saved Guideline Profiles**: Users can save and reuse brand/regulatory guideline profiles across tools.
- **Pure Tier-Based System**: Complete tier-based package subscription system (Free, Pro, Enterprise) with individual pricing and granular product usage limits, including subfeature controls (bulk processing, variations, brand guidelines).
- **No Individual Subscriptions**: System completely moved away from individual product subscriptions - users only subscribe to package tiers which grant access to multiple products with usage limits and tracking.
- **Tier Reordering**: Admin interface includes drag-and-drop style tier reordering with persistent sort order stored in database.
- **Legacy Code Removal**: All individual subscription buttons and deprecated handling completely removed (August 2025).
- **Advanced CMS with Block Builder**: Sophisticated content management system evolved from simple text editor to powerful block-based builder with row/column layouts, flexbox controls, drag-and-drop interface, real-time preview, and backward compatibility for existing markdown content.
- **Cloud Image Upload Integration**: Direct image upload functionality within CMS using Google Cloud Storage and Uppy integration, eliminating external URL dependencies with admin-authenticated upload endpoints.
- **Performance Optimizations**: Code splitting, tree shaking, privacy-focused analytics, font loading optimization, image optimization, and SEO.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database queries and schema management.

### AI/API Services
- **OpenAI API**: For content generation in tools (e.g., gpt-4o-mini).
- **Google OAuth 2.0**: For user authentication.

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework.
- **Radix UI**: Headless UI primitives.
- **Lucide React**: Icon library.
- **Google Fonts**: Web font delivery.

### Development Tools
- **Vite**: Build tool and development server.
- **TypeScript**: Type checking.
- **ESBuild**: Fast JavaScript bundler.
- **TSX**: TypeScript execution for development server.

### Form & Validation
- **React Hook Form**: Form state management and validation.
- **Zod**: Schema validation.
- **Hookform Resolvers**: Integration between React Hook Form and Zod.

### Utility Libraries
- **Date-fns**: Date manipulation.
- **Class Variance Authority**: For variant-based component APIs.
- **CLSX & Tailwind Merge**: Conditional class name composition.

### Session Management
- **Connect-PG-Simple**: PostgreSQL session store for Express sessions.