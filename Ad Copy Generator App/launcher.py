import webbrowser
import time
import threading
import sys
import os

def open_browser():
    """Open the web browser after a short delay."""
    time.sleep(2)  # Wait for Flask to start
    webbrowser.open('http://localhost:8080')

def main():
    """Main launcher function."""
    # Add the current directory to Python path
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    
    # Start browser in a separate thread
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    # Import and run the Flask app from app.py (not main.py)
    from app import app
    app.run(debug=False, port=8080, host='0.0.0.0')

if __name__ == "__main__":
    main() 