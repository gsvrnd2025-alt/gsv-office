# Patch TrueNAS SCALE rendered compose file to mount downloads folder to Nginx
import os

filepath = '/mnt/.ix-apps/app_configs/gsv-office/versions/1.0.0/templates/rendered/docker-compose.yaml'
if not os.path.exists(filepath):
    print(f"Error: File not found: {filepath}")
    exit(1)

with open(filepath, 'r') as f:
    content = f.read()

target = """    volumes:
    - /mnt/GSVR_Movies/apps/gsv-office/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - /mnt/GSVR_Movies/apps/gsv-office/nginx/conf.d:/etc/nginx/conf.d:ro
    - uploads_data:/var/www/uploads:ro"""

replacement = """    volumes:
    - /mnt/GSVR_Movies/apps/gsv-office/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - /mnt/GSVR_Movies/apps/gsv-office/nginx/conf.d:/etc/nginx/conf.d:ro
    - /mnt/GSVR_Movies/apps/gsv-office/downloads:/var/www/downloads:ro
    - uploads_data:/var/www/uploads:ro"""

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w') as f:
        f.write(content)
    print("SUCCESS: Patched docker-compose.yaml with downloads mount.")
else:
    print("WARNING: Target block not found. Checking if downloads mount is already present...")
    if "/var/www/downloads" in content:
        print("INFO: Downloads mount is already present in docker-compose.yaml.")
    else:
        print("ERROR: Nginx volumes configuration block did not match expected structure.")
        exit(1)
