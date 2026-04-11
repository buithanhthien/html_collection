#!/usr/bin/env python3
import os
import json
import webbrowser
import urllib.request
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading

IMAGE_EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'}

CONTENT_TYPE_MAP = {
    '.gif':  'image/gif',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',   
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg':  'image/svg+xml',
}

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

        if self.path.startswith('/api/proxy?'):
            qs = urllib.parse.parse_qs(self.path.split('?', 1)[1])
            url = qs.get('url', [None])[0]
            if not url:
                self.send_error(400, 'Missing url parameter')
                return
            try:
                req = urllib.request.Request(url, headers={
                    'User-Agent': 'Mozilla/5.0',
                    'Referer': url,
                })
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = resp.read()
                    ct = resp.headers.get('Content-Type', '')
                    # Fallback: guess from URL extension
                    if not ct or ct == 'application/octet-stream':
                        ext = os.path.splitext(url.split('?')[0])[1].lower()
                        ct = CONTENT_TYPE_MAP.get(ext, 'application/octet-stream')
                self.send_response(200)
                self.send_header('Content-Type', ct)
                self.send_header('Content-Length', len(data))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data)
            except Exception as e:
                self.send_error(502, f'Proxy error: {e}')
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
