#!/usr/bin/env python3
import os
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading

class MusicServer(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress logs
    
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
