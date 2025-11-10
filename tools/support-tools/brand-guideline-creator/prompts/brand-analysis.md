You are a brand analysis expert. Analyze the following website pages and extract comprehensive brand guidelines.

{{pagesContent}}

Based on the above website content, extract the following brand guideline information in JSON format:

{
  "domain_url": "the main domain URL",
  "color_palette": ["array of hex colors found in the design, limit to 5-8 main colors"],
  "tone_of_voice": "describe the overall tone and voice (professional, friendly, authoritative, casual, etc.)",
  "style_preferences": "describe the visual and design style preferences",
  "target_audience": [
    {
      "gender": "All/Male/Female or leave empty",
      "age_range": { "from_age": 25, "to_age": 45 },
      "profession": "target profession if evident",
      "interests": ["array of interests"],
      "other_keywords": ["B2B", "SaaS", etc.]
    }
  ],
  "brand_personality": ["array of personality traits like Innovative, Trustworthy, Bold"],
  "content_themes": ["array of main content themes"],
  "visual_style": "describe the visual style (minimalist, bold, playful, corporate, etc.)",
  "language_style": "describe the language and writing style used"
}

Guidelines for extraction:
1. Extract actual hex colours from CSS (look for background or background-color properties) and include the 3–5 most common accent or brand colours, excluding #FFFFFF and #000000.
2. Infer tone of voice from the copy and messaging used in headlines, CTAs, taglines, and product descriptions.
3. Identify target audience from product/service context, website content, imagery, and messaging. Use general web knowledge to refine audience details (e.g. cars → minimum age 17+, alcohol → 18+ UK, menopause products → older women).
4. Extract brand personality from how the brand presents itself through language, visuals, and positioning.
5. Identify content themes from recurring topics and key messages across the site.
6. Be specific and accurate based on actual content.
7. If information is not available, use null or an empty array.

Return ONLY the JSON object, no additional text.

