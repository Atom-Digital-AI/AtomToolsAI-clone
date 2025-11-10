Generate {{contentTypeInstruction}} based on the following:

{{#if url}}
WEBSITE URL: {{url}}
Please visit this URL, analyze the website content, and use that context to inform your SEO content creation.
{{/if}}

TARGET KEYWORDS: {{targetKeywords}}
BRAND NAME: {{brandName}}
SELLING POINTS: {{sellingPoints}}
LANGUAGE: {{languageInstruction}}
{{ragContext}}
{{#if brandGuidelines}}
🔴 CRITICAL BRAND GUIDELINES - MUST BE FOLLOWED:
{{brandGuidelines}}
{{/if}}
{{#if regulatoryGuidelines}}
🔴 CRITICAL REGULATORY COMPLIANCE - MUST BE FOLLOWED:
{{regulatoryGuidelines}}
{{/if}}

Generate {{numVariations}} variations.

Requirements:
- Titles: 50-60 characters (aim for at least 35 characters - 70% of limit)
- Descriptions: 150-160 characters (aim for at least 105 characters - 70% of limit), compelling and informative
- Include main keyword if it fits, otherwise use complete brand name "{{brandName}}"
- For keywords: use complete keyword phrase if it fits, otherwise use a shorter, grammatically correct version
- Use proper grammar with country abbreviations capitalized (UK, US, EU, etc.)
- {{caseInstruction}} while preserving proper nouns and technical terms
- Optimize for search intent

Negative Prompts: EM-Dashes, Partial brand names, poor grammar.

Approach this logically, step by step.

CRITICAL PRE-OUTPUT REVIEW CHECKLIST:
1. ✅ All brand guidelines have been strictly followed
2. ✅ All regulatory requirements have been met  
3. ✅ Content adheres to all formatting and character requirements
4. ✅ No negative prompts appear in the content

Before outputting, thoroughly review your results against ALL instructions provided, with special emphasis on brand and regulatory compliance.

Format your response as JSON:
{
    "titles": ["Title 1", "Title 2", "Title 3"],
    "descriptions": ["Description 1", "Description 2", "Description 3"]
}

