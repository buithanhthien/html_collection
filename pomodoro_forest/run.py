#!/usr/bin/env python3
import os
import json
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading

IMAGE_EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'}

class MusicServer(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress logs

    def do_GET(self):
        if self.path == '/api/backgrounds':
            img_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'asset', 'img')
            files = [
                f for f in os.listdir(img_dir)
                if os.path.splitext(f)[1].lower() in IMAGE_EXTS
            ]
            files.sort()
            body = json.dumps(files).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', len(body))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        super().end_headers()

def start_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print("🌐 Starting server at http://localhost:8000")
    print("🚀 Opening browser...")
    print("\n✨ Pomodoro Forest is running!")
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
