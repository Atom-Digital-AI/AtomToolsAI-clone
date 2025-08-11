import os
import shutil
import plistlib

def create_app_bundle():
    # Define paths
    app_name = "Ad Copy Generator.app"
    contents_dir = os.path.join(app_name, "Contents")
    macos_dir = os.path.join(contents_dir, "MacOS")
    resources_dir = os.path.join(contents_dir, "Resources")
    
    # Create directory structure
    os.makedirs(macos_dir, exist_ok=True)
    os.makedirs(resources_dir, exist_ok=True)
    
    # Copy executable
    shutil.copy2("dist/AdCopyGenerator", os.path.join(macos_dir, "AdCopyGenerator"))
    
    # Create Info.plist
    info_plist = {
        'CFBundleName': 'Ad Copy Generator',
        'CFBundleDisplayName': 'Ad Copy Generator',
        'CFBundleIdentifier': 'com.atomdigital.adcopygenerator',
        'CFBundleVersion': '1.0.0',
        'CFBundleShortVersionString': '1.0.0',
        'CFBundlePackageType': 'APPL',
        'CFBundleSignature': '????',
        'CFBundleExecutable': 'AdCopyGenerator',
        'LSMinimumSystemVersion': '10.10.0',
        'NSHighResolutionCapable': True,
    }
    
    with open(os.path.join(contents_dir, 'Info.plist'), 'wb') as f:
        plistlib.dump(info_plist, f)
    
    print(f"\nApp bundle created at: {app_name}")
    print("You can now move it to your Applications folder.")
    print("\nTo use the app:")
    print("1. Double-click 'Ad Copy Generator.app' to launch")
    print("2. Your browser will automatically open to the app")
    print("3. You can drag it to your Applications folder for easy access")

if __name__ == "__main__":
    create_app_bundle() 