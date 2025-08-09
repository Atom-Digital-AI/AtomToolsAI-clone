import os
import sys
import subprocess
import shutil

def install_requirements():
    """Install required packages for building the executable."""
    print("Installing PyInstaller...")
    subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)
    
    print("Installing other required packages...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)

def create_spec_file():
    """Create a PyInstaller spec file for the application."""
    spec_content = '''# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['launcher.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('templates', 'templates'),
        ('client_secrets.json', '.'),
        ('google-ads.yaml', '.'),
        ('.env', '.') if os.path.exists('.env') else None,
    ],
    hiddenimports=[
        'flask',
        'requests',
        'bs4',
        'openai',
        'pandas',
        'dotenv',
        'keyword_research',
        'ad_copy_generator',
        'webbrowser',
        'threading'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='AdCopyGenerator',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Set to False for no console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
'''
    
    with open('AdCopyGenerator.spec', 'w') as f:
        f.write(spec_content)
    
    print("Created PyInstaller spec file: AdCopyGenerator.spec")

def build_executable():
    """Build the executable using PyInstaller."""
    print("Building executable...")
    
    # Clean previous builds
    if os.path.exists('build'):
        shutil.rmtree('build')
    if os.path.exists('dist'):
        shutil.rmtree('dist')
    
    # Build the executable
    subprocess.run(['pyinstaller', 'AdCopyGenerator.spec'], check=True)
    
    print("Build completed successfully!")
    print("Executable location: dist/AdCopyGenerator")

def main():
    """Main function to orchestrate the build process."""
    print("Starting build process for Ad Copy Generator...")
    
    try:
        # Install requirements
        install_requirements()
        
        # Create spec file
        create_spec_file()
        
        # Build executable
        build_executable()
        
        print("\n" + "="*50)
        print("BUILD COMPLETED SUCCESSFULLY!")
        print("="*50)
        print("Your executable is located at: dist/AdCopyGenerator")
        print("To run the application, double-click the executable.")
        print("The application will automatically open in your default web browser at:")
        print("  http://localhost:8080")
        
    except Exception as e:
        print(f"Error during build process: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 