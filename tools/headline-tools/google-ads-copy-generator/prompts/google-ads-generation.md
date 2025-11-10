Based on the following requirements, generate compelling Google Ads copy:

{{#if url}}
WEBSITE URL: {{url}}
Please visit this URL, analyze the website content, and use that context to inform your ad creation.
{{/if}}

TARGET KEYWORDS: {{targetKeywords}}
BRAND NAME: {{brandName}}
SELLING POINTS: {{sellingPoints}}
{{languageInstruction}}
{{ragContext}}
{{#if brandGuidelines}}
🔴 CRITICAL BRAND GUIDELINES - MUST BE FOLLOWED:
{{brandGuidelines}}
{{/if}}
{{#if regulatoryGuidelines}}
🔴 CRITICAL REGULATORY COMPLIANCE - MUST BE FOLLOWED:
{{regulatoryGuidelines}}
{{/if}}

Generate Google Ads copy with EXACTLY this format:
- 3 headlines, each maximum 30 characters (aim for at least 21 characters - 70% of limit)
- 2 descriptions, each maximum 90 characters (aim for at least 63 characters - 70% of limit)

CRITICAL FORMATTING RULES:
- {{caseInstruction}}
- Keep country abbreviations capitalized (UK, US, EU, etc.) regardless of text case
- Include main keyword if it fits, otherwise use complete brand name "{{brandName}}"
- For keywords: use complete keyword phrase if it fits, otherwise use a shorter, grammatically correct version
- Preserve proper nouns and technical terms in their correct case

Make the headlines diverse:
- Headline 1: Include main keyword if it fits, otherwise use complete brand name
- Headline 2: Focus on selling points or benefits
- Headline 3: Include call to action or complete brand name

Make the descriptions compelling:
- Description 1: Highlight main benefit with keyword
- Description 2: Add urgency or call to action

Negative Prompts: EM-Dashes, Partial brand names, poor grammar.

Approach this logically, step by step.

CRITICAL PRE-OUTPUT REVIEW CHECKLIST:
1. ✅ All brand guidelines have been strictly followed
2. ✅ All regulatory requirements have been met  
3. ✅ Content adheres to all formatting and character requirements
4. ✅ No negative prompts appear in the content

Before outputting, thoroughly review your results against ALL instructions provided, with special emphasis on brand and regulatory compliance.

Format your response as JSON with arrays:
{
    "headlines": ["First headline", "Second headline", "Third headline"],
    "descriptions": ["First description", "Second description"]
}

