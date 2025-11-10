You are generating social media ad wireframes. Create 3 distinct concept options (A, B, C) for the following format.

PLATFORM: {{platform}}
FORMAT: {{format}}

AD SPEC:
{{adSpec}}

SUBJECT: {{subject}}
{{#if objective}}OBJECTIVE: {{objective}}{{/if}}

{{brandContext}}
{{targetAudienceContext}}
{{scrapedContext}}

REQUIREMENTS:
1. Generate 3 distinct creative concepts (Option A, Option B, Option C)
2. Each option should have different messaging angles
3. STRICTLY respect character limits for all text fields
4. Choose CTAs from the allowed options{{#if ctaOptions}}: {{ctaOptions}}{{/if}}
5. Provide media concept descriptions (we're not generating actual images/videos yet)
6. Include alt text for accessibility
7. Follow brand guidelines if provided

For each text field, ensure the text is UNDER the character limit.

Return a JSON array with 3 objects (A, B, C):
[
  {
    "optionLabel": "A",
    "textFields": {
      {{textFields}}
    },
    "ctaButton": "{{defaultCta}}",
    "mediaConcept": "Detailed description of the visual concept for this ad",
    "altText": "Accessibility description for the image/video",
    "rationale": "Why this concept works for the objective and audience"
  },
  ... (repeat for B and C with different concepts)
]

Return ONLY the JSON array, no additional text.

