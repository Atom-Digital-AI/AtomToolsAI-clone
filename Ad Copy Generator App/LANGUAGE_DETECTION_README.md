# Language Detection Feature

## Overview

The Ad Copy Generator App now includes automatic language detection and handling for bulk ad generation. This feature allows the app to:

- Automatically detect the language of input content (keywords, brand names, selling points, and webpage content)
- Generate ad copy in the same language as the detected input
- Handle mixed-language CSV files where different rows may contain content in different languages
- Support 50+ languages including major European, Asian, African, and Middle Eastern languages

## How It Works

### 1. Language Detection Process

The app uses the `langdetect` library to analyze the combined content from:

- Webpage content (URL text)
- Target keywords
- Brand name
- Selling points

The detection algorithm:

- Cleans the text by removing special characters
- Uses confidence-based detection for better accuracy
- Falls back to simple detection if confidence is low
- Defaults to English if detection fails

### 2. Language-Specific Prompt Generation

Once a language is detected, the app generates a language-specific instruction for the AI model:

```python
# Example language instructions
"Generate the ad copy in German."  # for German content
"Generate the ad copy in French."  # for French content
"Generate the ad copy in Spanish." # for Spanish content
```

### 3. Individual Row Processing

For bulk CSV processing, each row is processed individually:

- Language is detected for each row's content
- Ad copy is generated in the detected language
- Output maintains the original language for each row

## Supported Languages

The app supports 50+ languages including:

### European Languages

- English (en)
- German (de)
- French (fr)
- Spanish (es)
- Italian (it)
- Portuguese (pt)
- Dutch (nl)
- Polish (pl)
- Russian (ru)
- Swedish (sv)
- Danish (da)
- Norwegian (no)
- Finnish (fi)
- Czech (cs)
- Slovak (sk)
- Hungarian (hu)
- Romanian (ro)
- Bulgarian (bg)
- Croatian (hr)
- Slovenian (sl)
- Estonian (et)
- Latvian (lv)
- Lithuanian (lt)
- Maltese (mt)
- Greek (el)
- Irish (ga)
- Welsh (cy)
- Basque (eu)
- Catalan (ca)
- Galician (gl)
- Albanian (sq)
- Macedonian (mk)
- Serbian (sr)
- Bosnian (bs)
- Montenegrin (me)

### Asian Languages

- Japanese (ja)
- Korean (ko)
- Chinese (zh)
- Thai (th)
- Vietnamese (vi)
- Indonesian (id)
- Malay (ms)
- Filipino (tl)
- Bengali (bn)
- Hindi (hi)
- Urdu (ur)
- Nepali (ne)
- Sinhala (si)
- Burmese (my)
- Khmer (km)
- Lao (lo)
- Mongolian (mn)
- Georgian (ka)

### Middle Eastern & African Languages

- Arabic (ar)
- Hebrew (he)
- Persian (fa)
- Turkish (tr)
- Amharic (am)
- Swahili (sw)
- Zulu (zu)
- Afrikaans (af)

### Other Languages

- Icelandic (is)
- Thai (th)

## Usage Examples

### Single Ad Generation

When you input content in German:

```
Keywords: Geschäftssoftware
Brand: TechCorp
Selling Points: Einfach zu bedienen, 24/7 Support
URL Content: Willkommen bei unserer Premium-Softwarelösung...
```

The app will:

1. Detect German language
2. Generate German ad copy
3. Return headlines and descriptions in German

### Bulk CSV Processing

For a CSV with mixed languages:

```csv
Campaign Name, Ad Group Name, Target Keyword
English Campaign, Software Tools, business software
German Campaign, Geschäftstools, Geschäftssoftware
French Campaign, Outils Pro, logiciel professionnel
```

The app will:

1. Process each row individually
2. Detect English for row 1 → Generate English ads
3. Detect German for row 2 → Generate German ads
4. Detect French for row 3 → Generate French ads

## Testing the Feature

### Run the Test Script

```bash
python test_language_detection.py
```

This will test language detection accuracy with 50+ languages.

### Run the Demo Script

```bash
python demo_language_detection.py
```

This demonstrates how the feature works with real examples.

## Technical Implementation

### Key Functions

1. **`detect_language(text)`**

   - Detects language using langdetect library
   - Uses confidence-based detection
   - Cleans text for better accuracy

2. **`get_language_prompt(language_code)`**

   - Returns language-specific instructions
   - Supports 50+ languages
   - Defaults to English for unsupported languages

3. **`generate_ad_copy()`** (Modified)

   - Now includes language detection
   - Adds language instruction to AI prompt
   - Generates content in detected language

4. **`generate_seo_content()`** (Modified)
   - Includes language detection for SEO content
   - Generates titles and descriptions in detected language

### Dependencies

Added to `requirements.txt`:

```
langdetect==1.0.9
```

## Benefits

1. **Automatic Language Handling**: No manual language selection needed
2. **Mixed Language Support**: Handles CSV files with content in different languages
3. **Cultural Appropriateness**: Generates content appropriate for the detected language
4. **Improved Accuracy**: Uses confidence-based detection for better results
5. **Wide Language Support**: Supports 50+ languages out of the box

## Error Handling

- If language detection fails, defaults to English
- If content is empty or invalid, defaults to English
- Graceful fallback ensures the app continues to work

## Future Enhancements

Potential improvements:

- Add language-specific character limits for different languages
- Implement language-specific formatting rules
- Add support for regional variations (e.g., en-US vs en-GB)
- Include language-specific cultural considerations in prompts
