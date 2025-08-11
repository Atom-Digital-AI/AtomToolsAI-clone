#!/usr/bin/env python3
"""
Script to copy .env file to dist directory for the executable
"""

import os
import shutil

def copy_env_to_dist():
    """Copy .env file to dist directory"""
    
    print("Copying .env file to dist directory...")
    
    # Check if .env exists
    if not os.path.exists('.env'):
        print("ERROR: .env file not found in current directory!")
        return False
    
    # Check if dist directory exists
    if not os.path.exists('dist'):
        print("ERROR: dist directory not found!")
        return False
    
    # Copy .env to dist directory
    try:
        shutil.copy('.env', 'dist/.env')
        print("✓ .env file copied to dist directory")
        return True
    except Exception as e:
        print(f"ERROR: Failed to copy .env file: {e}")
        return False

if __name__ == "__main__":
    success = copy_env_to_dist()
    if success:
        print("\n✓ .env file is now available for the executable")
        print("You can now run the executable and it should find the API key")
    else:
        print("\n✗ Failed to copy .env file") 