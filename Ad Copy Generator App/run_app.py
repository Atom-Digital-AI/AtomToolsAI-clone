#!/usr/bin/env python3
"""
Launcher script for the Ad Copy Generator App
This ensures environment variables are loaded properly
"""

import os
import sys
from dotenv import load_dotenv

def main():
    """Main launcher function"""
    
    print("Starting Ad Copy Generator App...")
    print("=" * 40)
    
    # Load environment variables
    load_dotenv()
    
    # Check if API key is available
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY not found!")
        print("Please check your .env file and ensure it contains:")
        print("OPENAI_API_KEY=your_api_key_here")
        return False
    
    print(f"✓ OpenAI API key loaded (length: {len(api_key)})")
    
    # Import and run the Flask app
    try:
        from app import app, get_openai_api_key
        print("✓ Flask app imported successfully")
        
        # Double-check API key before starting
        if not api_key:
            print("WARNING: API key not found, trying to reload...")
            api_key = get_openai_api_key()
            if not api_key:
                print("ERROR: Cannot start app without API key!")
                return False
        
        print("Starting server on http://localhost:8080")
        print("Press Ctrl+C to stop the server")
        
        app.run(debug=True, host='0.0.0.0', port=8080)
        
    except Exception as e:
        print(f"ERROR: Failed to start Flask app: {e}")
        return False
    
    return True

if __name__ == "__main__":
    main() 