import os
import re

html_file = r"c:\Users\tiger\Desktop\Employee_Card-main\index.html"

with open(html_file, 'r', encoding='utf-8') as f:
    content = f.text = f.read()

# Extract CSS
style_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
if style_match:
    css_content = style_match.group(1).strip()
    os.makedirs(os.path.join(os.path.dirname(html_file), 'css'), exist_ok=True)
    with open(os.path.join(os.path.dirname(html_file), 'css', 'style.css'), 'w', encoding='utf-8') as f:
        f.write(css_content)
    # Replace style with link
    content = content.replace(style_match.group(0), '<link rel="stylesheet" href="css/style.css">')

# Extract JS
# Be careful: there's a script tag for html2canvas and jspdf before our main script tag.
# We want to extract the script tag that has const SHEET_ID...
script_match = re.search(r'<script>\s*const SHEET_ID(.*?)</script>', content, re.DOTALL)
if script_match:
    js_content = "const SHEET_ID" + script_match.group(1).strip()
    os.makedirs(os.path.join(os.path.dirname(html_file), 'js'), exist_ok=True)
    with open(os.path.join(os.path.dirname(html_file), 'js', 'script.js'), 'w', encoding='utf-8') as f:
        f.write(js_content)
    # Replace script with link
    content = content.replace(script_match.group(0), '<script src="js/script.js"></script>')

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Files successfully split!")
