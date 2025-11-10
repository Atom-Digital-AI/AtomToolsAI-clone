Generate 10 subtopic ideas for an article about: "{{conceptTitle}}"

Concept Summary: {{conceptSummary}}

Article Objectives: {{objective}}
Target Length: {{targetLength}} words
{{#if toneOfVoice}}Tone of Voice: {{toneOfVoice}}{{/if}}
{{languageInstruction}}
{{#if internalLinks}}Internal Links to Include: {{internalLinks}}{{/if}}
{{targetAudienceContext}}

{{brandContext}}
{{ragContext}}

{{webArticleStyleInstructions}}

{{antiFabricationInstructions}}

Provide 10 diverse subtopics that:
1. Cover the main topic comprehensively
2. Flow logically when combined
3. Are specific and actionable
4. Align with the article objectives

Return the response as a JSON array with this exact structure:
[
  {
    "title": "Subtopic Title",
    "summary": "What this subtopic will cover..."
  }
]

