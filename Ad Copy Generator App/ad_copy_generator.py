import os
from flask import Blueprint, render_template, request, redirect, url_for, flash, session
import requests
from bs4 import BeautifulSoup
import openai
import re
import pandas as pd
from io import StringIO
import csv
from dotenv import load_dotenv

ad_copy_bp = Blueprint('ad_copy', __name__)

# Load environment variables
load_dotenv()

# Initialize OpenAI client
openai.api_key = os.getenv("OPENAI_API_KEY")

# Move all your existing functions here (fetch_url_content, extract_text_from_html, etc.)
# ... copy all functions from your original app.py ...

@ad_copy_bp.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        # Copy your existing route logic here
        # ... copy the POST handling code from your original app.py ...
        pass
    return render_template('index.html') 