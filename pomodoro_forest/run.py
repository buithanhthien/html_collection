#!/usr/bin/env python3
import os
import json
import time
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

# Heartbeat: browser pings /api/ping every 5s; if no ping for 12s, server exits
_last_ping = time.time()
_PING_TIMEOUT = 12  # seconds

class MusicServer(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress logs

    def do_GET(self):
        global _last_ping

        if self.path == '/api/ping':
            _last_ping = time.time()
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.send_header('Content-Length', '2')
            self.end_headers()
            self.wfile.write(b'ok')
            return

        if self.path == '/api/backgrounds':
            img_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'asset', 'img')
            files = []
            if os.path.isdir(img_dir):
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


def _watchdog():
    """Exit if no ping received within timeout — means browser tab was closed."""
    # Give browser time to load before starting the watch
    time.sleep(20)
    while True:
        time.sleep(3)
        if time.time() - _last_ping > _PING_TIMEOUT:
            os._exit(0)


def start_server():
    import sys
    if getattr(sys, 'frozen', False):
        base_dir = sys._MEIPASS
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)

    server = HTTPServer(('', 8000), MusicServer)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    threading.Thread(target=_watchdog, daemon=True).start()

    webbrowser.open('http://localhost:8000/index.html')

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        os._exit(0)

if __name__ == '__main__':
    start_server()
