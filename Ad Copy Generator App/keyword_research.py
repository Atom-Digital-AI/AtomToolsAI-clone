import os
from flask import Flask, render_template, request, jsonify, send_file, Blueprint
import openai
from bs4 import BeautifulSoup
import requests
import pandas as pd
from io import StringIO, BytesIO
import csv
from dotenv import load_dotenv
from urllib.parse import urlparse
import logging
import yaml
import json
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
import time
from tenacity import retry, stop_after_attempt, wait_exponential
import string

keyword_research_bp = Blueprint('keyword_research', __name__)

# Load environment variables
load_dotenv()

# Initialize OpenAI client
openai.api_key = os.getenv("OPENAI_API_KEY")

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Update the client initialization section
try:
    # First, let's read and validate the YAML file
    yaml_path = 'google-ads.yaml'
    with open(yaml_path, 'r') as yaml_file:
        config = yaml.safe_load(yaml_file)
        
        # Update customer ID from environment
        customer_id = os.getenv('GOOGLE_ADS_CUSTOMER_ID')
        if not customer_id:
            raise ValueError("GOOGLE_ADS_CUSTOMER_ID not found in environment variables")
        
        # Update the config with the customer ID
        config['login_customer_id'] = customer_id
        
        # Save the updated config back to the YAML file
        with open(yaml_path, 'w') as yaml_file:
            yaml.dump(config, yaml_file)
        
        logger.debug("YAML contents (sanitized):")
        debug_config = config.copy()
        for key in ['client_secret', 'refresh_token']:
            if key in debug_config:
                debug_config[key] = debug_config[key][:5] + '...'
        logger.debug(debug_config)

    google_ads_client = GoogleAdsClient.load_from_storage(yaml_path)
    logger.info("Successfully initialized Google Ads client")

except Exception as e:
    logger.error(f"Error initializing Google Ads client: {str(e)}")
    google_ads_client = None

def fetch_url_content(url):
    """Fetch and parse only the most relevant content and title from a URL."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')

        # Extract slug from URL
        parsed_url = urlparse(url)
        slug = parsed_url.path.strip('/').replace('-', ' ').replace('_', ' ')

        # Extract title (prefer <title>, fallback to <h1>)
        title = ''
        if soup.title and soup.title.string:
            title = soup.title.string.strip()
        elif soup.find('h1'):
            title = soup.find('h1').get_text(strip=True)

        # Extract meta description
        meta_desc = ''
        meta_tag = soup.find('meta', attrs={'name': 'description'})
        if meta_tag and meta_tag.get('content'):
            meta_desc = meta_tag['content'].strip()

        # Find the main content area
        main = (
            soup.find('main') or
            soup.find('article') or
            soup.find('div', class_='content') or
            soup.find('div', id='content') or
            soup.find('div', class_='main') or
            soup.find('div', id='main') or
            soup.body
        )

        # Remove header, nav, footer, aside, and common sidebar/menu elements from main
        for tag in main.find_all(['header', 'nav', 'footer', 'aside']):
            tag.decompose()
        for cls in ['sidebar', 'menu', 'navigation', 'footer', 'header']:
            for tag in main.find_all(class_=cls):
                tag.decompose()

        # Extract H1 and H2 from main content only
        h1 = ''
        h1_tag = main.find('h1')
        if h1_tag:
            h1 = h1_tag.get_text(strip=True)

        h2s = [h2.get_text(strip=True) for h2 in main.find_all('h2')]
        h2s_text = ' '.join(h2s)

        # Concatenate all relevant parts
        content = f"Slug: {slug}\nTitle: {title}\nMeta Description: {meta_desc}\nH1: {h1}\nH2s: {h2s_text}"

        return content, title

    except Exception as e:
        logger.error(f"Error fetching URL {url}: {str(e)}")
        return None, None

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry_error_callback=lambda _: ([''], None)[0]  # Return empty list on failure
)
def generate_seed_keywords(url, content, title):
    """Generate 2-3 highly relevant seed keywords using AI analysis, with few-shot examples and slug/title analysis."""
    try:
        prompt = f"""
You are an expert SEO keyword researcher.

Given a webpage's URL, title, and content, generate 2-3 highly relevant, high-intent search keywords that a user would type to find this exact page.

- Use the URL slug and page title as the main signals for the topic.
- **Retain any question or context phrases** that clarify the page's purpose (e.g., 'how do they work', 'what is', 'how to', 'for beginners', 'step by step', 'why', 'when', 'where', 'how much', 'how long', 'how many', 'pros and cons', 'benefits', 'cost', 'examples', 'comparison', 'vs', 'difference between').
- **Only remove truly generic or editorial fluff** (e.g., 'let's take a look', 'the ultimate guide', 'all you need to know', 'complete guide', 'read more', 'overview').
- Focus on the core topic and its specific context.
- Output keywords that are concise, natural, and what people actually search for.

Here are some examples:

URL: https://londongolfpa.com/golf-handicaps-how-do-they-work/
Title: Golf Handicaps: How Do They Work?
Good keywords:
- how do golf handicaps work
- what is a golf handicap
- golf handicap explained

URL: https://londongolfpa.com/how-many-clubs-are-in-a-golf-bag-lets-take-a-look/
Title: How Many Clubs Are In A Golf Bag: Let's Take A Look
Good keywords:
- how many clubs are in a golf bag
- how many golf clubs in a set
- golf how many clubs allowed in bag

URL: https://londongolfpa.com/how-much-are-golf-lessons-the-ultimate-guide/
Title: How Much Are Golf Lessons: The Ultimate Guide
Good keywords:
- how much are golf lessons
- how much are golf lessons per hour
- how much are golf lessons for beginners

URL: https://londongolfpa.com/how-to-get-good-at-golf/
Title: How To Get Good At Golf
Good keywords:
- how to become a better golfer
- how to get good at golf
- how to become a good golfer fast

URL: https://londongolfpa.com/how-to-hold-a-golf-club/
Title: How To Hold A Golf Club
Good keywords:
- how to hold a golf club
- how to hold a golf club for beginners
- golf grip how to hold the club

Now, for this page:

URL: {url}
Title: {title}
Content: {content[:1000]}...

Output the keywords in a JSON array, e.g.:
["keyword 1", "keyword 2", "keyword 3"]
"""

        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a professional SEO keyword researcher. Avoid brand terms unless they are explicitly prominent in the page's main elements."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        
        content_out = response.choices[0].message.content.strip()
        logger.debug(f"OpenAI response: {content_out}")
        
        try:
            keywords = json.loads(content_out)
            if isinstance(keywords, list) and len(keywords) > 0:
                logger.debug(f"Generated seed keywords: {keywords}")
                return keywords
            else:
                logger.error("Invalid keyword format returned from OpenAI")
                return ['']
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}")
            return ['']
            
    except Exception as e:
        logger.error(f"Error generating keyword: {str(e)}")
        return ['']

def simulate_keyword_metrics(keyword):
    """Simulate keyword metrics (temporary replacement for Google Ads API)."""
    import random
    
    if not keyword or keyword.strip() == '':
        keyword = "sample keyword"  # Provide a default keyword if none given
    
    # Generate 3 variations of the keyword
    variations = [
        keyword,
        f"best {keyword}",
        f"{keyword} guide"
    ]
    
    # Generate metrics for each variation
    results = []
    for var in variations:
        results.append({
            'text': var,
            'avg_monthly_searches': random.randint(1000, 10000),
            'competition': random.choice(['LOW', 'MEDIUM', 'HIGH'])
        })
    
    logger.debug(f"Simulated metrics for {keyword}: {results}")
    return results

def get_keyword_ideas(keyword):
    """Get keyword ideas from Google Ads API."""
    if not google_ads_client:
        raise Exception("Google Ads client not initialized. Please check your credentials.")
    
    # Get customer ID from environment variable
    customer_id = os.getenv('GOOGLE_ADS_CUSTOMER_ID')
    if not customer_id:
        raise Exception("GOOGLE_ADS_CUSTOMER_ID not found in environment variables")
    
    logger.debug(f"Making API call with customer_id: {customer_id} and keyword: {keyword}")
    
    # Get the service
    keyword_plan_idea_service = google_ads_client.get_service("KeywordPlanIdeaService")
    
    # Create the request
    request = google_ads_client.get_type("GenerateKeywordIdeasRequest")
    request.customer_id = customer_id
    
    # Set up the keyword seed
    keyword_seed = google_ads_client.get_type("KeywordSeed")
    keyword_seed.keywords.append(keyword)
    request.keyword_seed = keyword_seed
    
    # Set location and language
    request.geo_target_constants = ["geoTargetConstants/2840"]
    request.language = "languageConstants/1000"
    
    # Add metadata
    metadata = [
        ('login-customer-id', customer_id),
    ]
    
    logger.debug("About to make API call")
    # Make the API call
    response = keyword_plan_idea_service.generate_keyword_ideas(
        request=request,
        metadata=metadata
    )
    logger.debug("API call completed")
    
    # Process the response
    keyword_ideas = []
    for idea in response:
        keyword_ideas.append({
            'text': idea.text,
            'avg_monthly_searches': idea.keyword_idea_metrics.avg_monthly_searches,
            'competition': idea.keyword_idea_metrics.competition.name
        })
        logger.debug(f"Received keyword idea: {idea.text}")
    
    return keyword_ideas[:3]

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry_error_callback=lambda _: True  # Return True on failure to be lenient
)
def check_keyword_relevance(url_content, keyword):
    """Check if a keyword is thematically relevant to the URL content."""
    try:
        prompt = f"""
Analyze if this keyword is highly relevant to the webpage content. Consider:
1. Is the keyword directly related to the main topic?
2. Does the content provide substantial information about this topic?
3. Would this keyword accurately represent what users would find on this page?

Content: {url_content[:1500]}...
Keyword: {keyword}

Rate the relevance on a scale of 0-100, where:
0-20: Not relevant
21-40: Slightly relevant
41-60: Moderately relevant
61-80: Highly relevant
81-100: Perfectly relevant

Return only the number.
"""
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a strict keyword relevance analyzer. Only return high relevance scores for keywords that are directly and substantially related to the content."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        
        try:
            score = int(response.choices[0].message.content.strip())
            logger.debug(f"Relevance score for '{keyword}': {score}")
            return score
        except ValueError:
            logger.error(f"Invalid relevance score returned: {response.choices[0].message.content}")
            return 0
        
    except Exception as e:
        logger.error(f"Error checking relevance: {e}")
        return 0  # Return 0 on errors to be strict

def extract_slug_keyword(url):
    """Extract a keyword from the URL slug."""
    try:
        # Parse the URL and get the path
        parsed_url = urlparse(url)
        path = parsed_url.path.strip('/')
        
        # Split by common separators and take the last meaningful part
        parts = path.replace('-', ' ').replace('_', ' ').split('/')
        # Filter out empty strings and common URL elements
        parts = [p for p in parts if p and p not in ['www', 'index', 'html', 'php']]
        
        if not parts:
            return None
            
        # Take the last meaningful part of the URL
        slug = parts[-1]
        
        # Clean up the slug
        slug = slug.replace('-', ' ').replace('_', ' ')
        # Remove any URL encoding
        slug = requests.utils.unquote(slug)
        # Remove any file extensions
        slug = slug.rsplit('.', 1)[0]
        # Clean up extra spaces
        slug = ' '.join(slug.split())
        
        # Only return if it's a meaningful keyword (more than 2 characters)
        if len(slug) > 2:
            return slug
        return None
        
    except Exception as e:
        logger.error(f"Error extracting slug keyword: {e}")
        return None

@keyword_research_bp.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        try:
            urls_input = request.form.get('urls', '')
            urls = [url.strip() for url in urls_input.split('\n') if url.strip()]
            
            if not urls:
                return jsonify({
                    'error': 'No valid URLs provided',
                    'message': 'Please enter at least one valid URL.'
                }), 400
            
            results = []
            for url in urls:
                logger.debug(f"Processing URL: {url}")
                content, title = fetch_url_content(url)
                if not content:
                    logger.error(f"Could not fetch content for URL: {url}")
                    continue
                
                # Get both AI-generated and slug-based seed keywords
                ai_seed_keywords = generate_seed_keywords(url, content, title)
                slug_keyword = extract_slug_keyword(url)
                
                seed_keywords = []
                if ai_seed_keywords[0]:
                    seed_keywords.append(ai_seed_keywords[0])
                if slug_keyword:
                    seed_keywords.append(slug_keyword)
                
                if not seed_keywords:
                    logger.error(f"No seed keywords generated for URL: {url}")
                    continue
                
                # Process each seed keyword
                all_keyword_ideas = []
                for seed in seed_keywords:
                    # Make the actual API call
                    keyword_ideas = get_keyword_ideas(seed)
                    logger.debug(f"Got keyword ideas for seed '{seed}': {keyword_ideas}")
                    all_keyword_ideas.extend(keyword_ideas)
                
                # Process and score keywords
                scored_keywords = []
                for idea in all_keyword_ideas:
                    relevance_score = check_keyword_relevance(content, idea['text'])
                    if relevance_score >= 60:  # Only include highly relevant keywords
                        scored_keywords.append({
                            'url': url,
                            'seed_keyword': seed_keywords[0],  # Keep the AI seed as primary
                            'slug_keyword': slug_keyword if slug_keyword else '',
                            'keyword': idea['text'],
                            'search_volume': idea['avg_monthly_searches'],
                            'competition': idea['competition'],
                            'relevance_score': relevance_score
                        })
                
                # --- DEDUPLICATION AND NEAR-DUPLICATE FILTERING ---
                def normalize_kw(kw):
                    # Lowercase, remove punctuation, sort words
                    table = str.maketrans('', '', string.punctuation)
                    words = kw.lower().translate(table).split()
                    return ' '.join(sorted(words))
                
                unique_map = {}
                for kw in scored_keywords:
                    norm = normalize_kw(kw['keyword'])
                    if norm not in unique_map:
                        unique_map[norm] = kw
                    else:
                        # Keep the one with higher search volume
                        if kw['search_volume'] > unique_map[norm]['search_volume']:
                            unique_map[norm] = kw
                deduped_keywords = list(unique_map.values())
                
                # Sort by relevance score (descending) and then by search volume
                deduped_keywords.sort(key=lambda x: (-x['relevance_score'], -x['search_volume']))
                
                # Take top 3 most relevant keywords
                results.extend(deduped_keywords[:3])
            
            if results:
                # Create CSV
                output = StringIO()
                writer = csv.DictWriter(output, fieldnames=[
                    'url', 'seed_keyword', 'slug_keyword', 'keyword', 'search_volume', 'competition', 'relevance_score'
                ])
                writer.writeheader()
                writer.writerows(results)
                
                mem = BytesIO()
                mem.write(output.getvalue().encode('utf-8'))
                mem.seek(0)
                
                response = send_file(
                    mem,
                    mimetype='text/csv',
                    as_attachment=True,
                    download_name='keyword_research.csv'
                )
                # Add header to signal completion
                response.headers['X-Analysis-Complete'] = 'true'
                return response
            else:
                return jsonify({
                    'error': 'No Results',
                    'message': 'No highly relevant keywords found for the provided URLs.'
                }), 404
            
        except Exception as e:
            logger.error(f"Error processing request: {str(e)}")
            return jsonify({
                'error': 'Internal Server Error',
                'message': 'An error occurred while processing the request.'
            }), 500
            
    return render_template('keyword_research.html') 