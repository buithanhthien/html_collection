#!/usr/bin/env python3
import os
import json
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading

class MusicServer(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress logs
    
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def scan_music():
    sound_dir = 'asset/sound'
    if os.path.exists(sound_dir):
        mp3_files = sorted([f for f in os.listdir(sound_dir) if f.endswith('.mp3')])
    else:
        mp3_files = []
    
    with open('music-list.json', 'w', encoding='utf-8') as f:
        json.dump(mp3_files, f, ensure_ascii=False, indent=2)
    
    return len(mp3_files)

def start_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    count = scan_music()
    print(f"🎵 Found {count} music files")
    print("🌐 Starting server at http://localhost:8000")
    print("🚀 Opening browser...")
    print("\n✨ Pomodoro Forest is running!")
    print("📁 Add .mp3 files to asset/sound/ folder")
    print("🔄 Refresh the page to see new songs")
    print("\n⚠️  Keep this window open while using the app")
    print("❌ Close this window to stop the server\n")
    
    # Start server in background
    server = HTTPServer(('', 8000), MusicServer)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    
    # Open browser
    webbrowser.open('http://localhost:8000/index.html')
    
    try:
        while True:
            pass
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down...")
        server.shutdown()

if __name__ == '__main__':
    start_server()
