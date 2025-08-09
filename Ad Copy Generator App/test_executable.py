#!/usr/bin/env python3
"""
Test script to verify the new executable works with port 8080
"""

import subprocess
import time
import requests
import os

def test_executable():
    """Test the new executable"""
    
    print("Testing new AdCopyGenerator executable...")
    print("=" * 50)
    
    # Check if executable exists
    executable_path = "dist/AdCopyGenerator"
    if not os.path.exists(executable_path):
        print("✗ Executable not found at dist/AdCopyGenerator")
        return False
    
    print("✓ Executable found")
    
    # Start the executable
    print("Starting executable...")
    try:
        process = subprocess.Popen([executable_path], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE)
        
        # Wait a moment for the app to start
        time.sleep(5)
        
        # Test if the app is running on port 8080
        try:
            response = requests.get("http://localhost:8080", timeout=5)
            if response.status_code == 200:
                print("✓ App is running on port 8080")
                print("✓ Web interface is accessible")
                
                # Stop the process
                process.terminate()
                process.wait()
                
                return True
            else:
                print(f"✗ App responded with status code: {response.status_code}")
                process.terminate()
                return False
                
        except requests.exceptions.ConnectionError:
            print("✗ Could not connect to port 8080")
            process.terminate()
            return False
        except Exception as e:
            print(f"✗ Error testing app: {e}")
            process.terminate()
            return False
            
    except Exception as e:
        print(f"✗ Error starting executable: {e}")
        return False

if __name__ == "__main__":
    success = test_executable()
    if success:
        print("\n✓ Executable test passed!")
        print("Your new AdCopyGenerator executable is working correctly on port 8080")
    else:
        print("\n✗ Executable test failed")
        print("Please check the error messages above") 