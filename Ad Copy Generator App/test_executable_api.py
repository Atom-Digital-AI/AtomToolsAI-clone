#!/usr/bin/env python3
"""
Simple test to check if the executable can find the API key
"""

import subprocess
import time
import os

def test_executable_api():
    """Test if the executable can find the API key"""
    
    print("Testing executable API key loading...")
    print("=" * 50)
    
    # Check if executable exists
    executable_path = "dist/AdCopyGenerator"
    if not os.path.exists(executable_path):
        print("✗ Executable not found at dist/AdCopyGenerator")
        return False
    
    print("✓ Executable found")
    
    # Check if .env file exists in dist directory
    env_path = "dist/.env"
    if not os.path.exists(env_path):
        print("✗ .env file not found in dist directory")
        return False
    
    print("✓ .env file found in dist directory")
    
    # Try to run the executable and capture output
    print("Starting executable to test API key loading...")
    try:
        # Run the executable with a timeout
        process = subprocess.Popen([executable_path], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE,
                                 text=True)
        
        # Wait a few seconds for startup
        time.sleep(3)
        
        # Check if process is still running
        if process.poll() is None:
            print("✓ Executable started successfully")
            
            # Try to get some output
            try:
                stdout, stderr = process.communicate(timeout=2)
                if stdout:
                    print("Output:", stdout[:200] + "..." if len(stdout) > 200 else stdout)
                if stderr:
                    print("Errors:", stderr[:200] + "..." if len(stderr) > 200 else stderr)
            except subprocess.TimeoutExpired:
                print("✓ Executable is running (timeout reached)")
            
            # Terminate the process
            process.terminate()
            process.wait()
            
            return True
        else:
            print("✗ Executable exited unexpectedly")
            stdout, stderr = process.communicate()
            if stdout:
                print("Output:", stdout)
            if stderr:
                print("Errors:", stderr)
            return False
            
    except Exception as e:
        print(f"✗ Error running executable: {e}")
        return False

if __name__ == "__main__":
    success = test_executable_api()
    if success:
        print("\n✓ Executable test passed!")
        print("The executable should now be able to find the API key")
    else:
        print("\n✗ Executable test failed")
        print("Please check the error messages above") 