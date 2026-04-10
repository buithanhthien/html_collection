#!/usr/bin/env python3
import os

sound_dir = 'asset/sound'
mp3_files = [f for f in os.listdir(sound_dir) if f.endswith('.mp3')]

# Generate JavaScript file
js_content = f'''// Auto-generated music list
const MUSIC_FILES = {mp3_files};
'''

# Read the template
with open('music.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the music files array
import re
pattern = r'const MUSIC_FILES = \[.*?\];'
if re.search(pattern, content, re.DOTALL):
    content = re.sub(pattern, f'const MUSIC_FILES = {mp3_files};', content, flags=re.DOTALL)
else:
    # Add it at the beginning if not found
    content = f'const MUSIC_FILES = {mp3_files};\n\n' + content

with open('music.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Updated music.js with {len(mp3_files)} files")
