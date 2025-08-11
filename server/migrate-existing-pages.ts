// Script to migrate existing marketing pages to CMS
// Run this once to populate the CMS with existing site content

import { storage } from "./storage";

const existingPages = [
  {
    title: "Home - AI Marketing Tools & Automation",
    slug: "/",
    type: "static" as const,
    status: "published" as const,
    metaTitle: "atomtools.ai - AI Marketing Tools & Automation Platform",
    metaDescription: "Build and launch campaigns faster with AI-powered marketing tools. Facebook Ads connectors, SEO generators, and automation tools for agencies and small businesses.",
    content: `# Welcome to atomtools.ai

Transform your marketing workflows with AI-powered tools designed for speed, accuracy, and scale.

## Why Choose atomtools.ai?

- **Build and launch campaigns faster** - Skip the manual work
- **Reduce manual ops** - Automate repetitive tasks  
- **Standardise quality** - Consistent, professional output

## Features

### Plug-and-play tools
Install and use in minutes. No complex setup or technical knowledge required.

### Built for speed
Opinionated defaults, undo/redo, smart presets. Get results faster than ever.

### Data-safe by design
Clear privacy, export controls. Your data stays yours, always.

## Our Tools Stack

- **Connectors**: Facebook Ads, Looker Studio integration
- **Generators**: AI-powered ad copy, SEO meta tags, content creation  
- **Reporting helpers**: Automated dashboards, custom metrics, scheduled reports
- **Flexible pricing**: Free to start, upgrade per tool as you grow

Ready to supercharge your marketing? [Get started today](/sign-up).`,
    ogTitle: "atomtools.ai - AI Marketing Tools & Automation Platform",
    ogDescription: "Build and launch campaigns faster with AI-powered marketing tools. Facebook Ads connectors, SEO generators, and automation tools for agencies and small businesses.",
    ogType: "website",
  },
  {
    title: "Tools - AI Marketing Tools",
    slug: "/tools",
    type: "static" as const,
    status: "published" as const,
    metaTitle: "AI Marketing Tools - Facebook Ads, SEO, Google Ads | atomtools.ai",
    metaDescription: "Explore our collection of AI-powered marketing tools including Facebook Ads connectors, SEO meta generators, and Google Ads copy creation tools.",
    content: `# AI Marketing Tools

Discover our comprehensive suite of AI-powered marketing tools designed to streamline your campaigns and boost performance.

## Available Tools

### Facebook Ads Looker Studio Connector Guide
Complete guide to building your own Facebook Ads connector. No monthly fees or data storage costs.

**Features:**
- Step-by-step instructions
- Complete source code included  
- Full control & oversight

[Learn More](/tools/facebook-ads-looker-studio-connector)

### SEO Meta Generator
AI-powered meta tag generation for better search rankings and click-through rates.

**Features:**
- Bulk processing capabilities
- Multiple language support
- Brand guideline compliance

[Learn More](/tools/seo-meta-generator)

### Google Ads Copy Generator  
Create high-converting Google Ads copy with AI assistance and best practice templates.

**Features:**
- Multiple ad variations
- A/B testing suggestions
- Compliance checking

[Learn More](/tools/google-ads-copy-generator)

Ready to get started? [Sign up for free](/sign-up) and try any tool today.`,
    ogTitle: "AI Marketing Tools - Facebook Ads, SEO, Google Ads",
    ogDescription: "Explore our collection of AI-powered marketing tools including Facebook Ads connectors, SEO meta generators, and Google Ads copy creation tools.",
  },
  {
    title: "Pricing - Flexible Plans for Every Business", 
    slug: "/pricing",
    type: "static" as const,
    status: "published" as const,
    metaTitle: "Pricing - Flexible AI Marketing Tool Plans | atomtools.ai",
    metaDescription: "Choose the perfect plan for your business. Free to start, scale as you grow. Transparent pricing for Facebook Ads tools, SEO generators, and more.",
    content: `# Simple, Transparent Pricing

Choose the plan that fits your business needs. Start free and scale as you grow.

## Plans Overview

All plans include access to our core marketing tools with different usage limits and features.

### Free Tier
Perfect for trying out our tools and small projects.

### Pro Plans  
Ideal for growing businesses and marketing agencies.

### Enterprise
Custom solutions for large organizations with specific needs.

## Frequently Asked Questions

**Can I change plans anytime?**
Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.

**What happens to my data if I cancel?**
Your data remains accessible for 30 days after cancellation. You can export everything at any time.

**Do you offer refunds?**
We offer a 14-day money-back guarantee on all paid plans, no questions asked.

**How does billing work?**
You're billed monthly or annually depending on your chosen plan. All prices are in GBP and exclude VAT where applicable.

**Can I use multiple tools on one plan?**
Yes! Your plan covers access to all available tools within your usage limits.

Ready to get started? [View detailed pricing](/pricing#plans)`,
    ogTitle: "Pricing - Flexible AI Marketing Tool Plans",
    ogDescription: "Choose the perfect plan for your business. Free to start, scale as you grow. Transparent pricing for Facebook Ads tools, SEO generators, and more.",
  },
  {
    title: "Resources - Marketing Guides & Templates",
    slug: "/resources", 
    type: "static" as const,
    status: "published" as const,
    metaTitle: "Marketing Resources - Guides, Templates & Tutorials | atomtools.ai",
    metaDescription: "Free marketing resources including Facebook Ads guides, SEO tutorials, templates, and best practices for digital marketing automation.",
    content: `# Marketing Resources

Explore our collection of guides, tutorials, and templates to help you get the most out of your marketing efforts.

## Blog Posts

### 5 Metrics That Actually Matter for Facebook Ads
Stop tracking vanity metrics and focus on what drives real business growth with these essential KPIs.
*5 min read | Marketing*

### Meta Tag Automation: A Complete Guide  
Learn how to scale your SEO meta tag creation process using AI and automation tools.
*8 min read | SEO*

### Building Your First Marketing Automation Workflow
Step-by-step guide to creating automated marketing workflows that save time and increase conversions.
*12 min read | Automation*

## How-to Tutorials

### Setting up Facebook Ads Connector
Complete walkthrough of connecting your Facebook Ads account to Looker Studio.
*15 min tutorial*

### Bulk SEO Meta Generation
Learn how to generate hundreds of meta tags from CSV data in minutes.
*8 min tutorial*

### Google Ads Copy Optimisation
Best practices for creating high-converting ad copy using AI assistance.
*12 min tutorial*

## Free Templates

### Facebook Ads Dashboard Template
Ready-to-use Looker Studio dashboard for Facebook Ads performance tracking.
*Free Download*

### SEO Audit Checklist
Comprehensive checklist for conducting SEO audits and identifying optimization opportunities.
*Free Download*

### Ad Copy Testing Framework
Structured approach to testing and optimizing your advertising copy across platforms.
*Free Download*

Looking for something specific? [Contact our team](/contact) for personalized guidance.`,
    ogTitle: "Marketing Resources - Guides, Templates & Tutorials",
    ogDescription: "Free marketing resources including Facebook Ads guides, SEO tutorials, templates, and best practices for digital marketing automation.",
  }
];

export async function migrateExistingPages() {
  console.log("Starting migration of existing pages to CMS...");
  
  // Get admin user to set as author
  const adminUsers = await storage.getAllUsers();
  const adminUser = adminUsers.find(user => user.isAdmin);
  
  if (!adminUser) {
    console.error("No admin user found. Please ensure at least one admin user exists.");
    return;
  }

  for (const pageData of existingPages) {
    try {
      // Check if page already exists
      const existing = await storage.getCmsPageBySlug(pageData.slug);
      if (existing) {
        console.log(`Page ${pageData.slug} already exists, skipping...`);
        continue;
      }

      // Create the page
      await storage.createCmsPage(adminUser.id, {
        title: pageData.title,
        slug: pageData.slug,
        type: pageData.type,
        status: pageData.status,
        content: pageData.content,
        excerpt: pageData.metaDescription,
        metaTitle: pageData.metaTitle,
        metaDescription: pageData.metaDescription,
        ogTitle: pageData.ogTitle,
        ogDescription: pageData.ogDescription,
        ogType: pageData.ogType || "website",
        publishedAt: new Date(),
      });

      console.log(`Successfully created CMS page: ${pageData.title}`);
    } catch (error) {
      console.error(`Error creating page ${pageData.slug}:`, error);
    }
  }
  
  console.log("Migration completed!");
}

// Function is already exported above