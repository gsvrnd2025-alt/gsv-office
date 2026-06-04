import os
import zipfile

logo_path = 'c:/Users/GSVPC_F2/Documents/A gsv office plugin/frontend/src/assets/gsvlogo.png'
ico_path = 'c:/Users/GSVPC_F2/Documents/A gsv office plugin/desktop-client/assets/icon.ico'
readme_content = """GSV Office Client Platform v1.0.0
=================================
This archive contains the official cross-platform GSV Office Remote client assets.

Included Files:
- logo.png: Official GSV Office logo icon (1024x1024 square)
- icon.ico: Windows multi-resolution icon (256px to 16px)

Please connect to your GSV Office server dashboard at http://192.168.0.177:8080 to configure remote desktop access settings.
"""

temp_readme_path = 'scratch/README.txt'
with open(temp_readme_path, 'w', encoding='utf-8') as f:
    f.write(readme_content)

destinations = [
    'c:/Users/GSVPC_F2/Documents/A gsv office plugin/downloads/GSVOffice-Android.apk',
    'c:/Users/GSVPC_F2/Documents/A gsv office plugin/downloads/GSVOffice-Mac.dmg',
    'c:/Users/GSVPC_F2/Documents/A gsv office plugin/downloads/gsv-office-client',
    'c:/Users/GSVPC_F2/Documents/A gsv office plugin/frontend/public/downloads/GSVOffice-Android.apk',
    'c:/Users/GSVPC_F2/Documents/A gsv office plugin/frontend/public/downloads/GSVOffice-Mac.dmg',
    'c:/Users/GSVPC_F2/Documents/A gsv office plugin/frontend/public/downloads/gsv-office-client',
]

for dest in destinations:
    dir_name = os.path.dirname(dest)
    if not os.path.exists(dir_name):
        os.makedirs(dir_name)
    
    with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.write(logo_path, 'logo.png')
        zip_file.write(ico_path, 'icon.ico')
        zip_file.write(temp_readme_path, 'README.txt')
    
    print(f"Generated package: {dest} (Size: {os.path.getsize(dest)} bytes)")

if os.path.exists(temp_readme_path):
    os.remove(temp_readme_path)

print("Mock packages packaging complete!")
