import json
import sys

try:
    apps = json.load(open('/tmp/apps.json'))
    gsv = [a for a in apps if a['id'] == 'gsv-office']
    if not gsv:
        print("gsv-office app not found.")
        sys.exit(1)
        
    print(json.dumps(gsv[0], indent=2))
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
