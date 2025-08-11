#!/bin/bash

echo "Building Ad Copy Generator Executable..."
echo "======================================"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Run the build script
python3 build_exe.py

echo ""
echo "Build process completed!"
echo "Check the 'dist' folder for your executable." 