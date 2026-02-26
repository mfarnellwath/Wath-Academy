"""Desktop launcher for the floating name picker.

This starts a local HTTP server rooted at this folder and opens the app in the
user's default browser. It is intended to be bundled into a single executable
with PyInstaller (see build_exe.bat / build_exe.ps1).
"""

from __future__ import annotations

import http.server
import os
import socketserver
import threading
import time
import webbrowser
import sys
from pathlib import Path

DEFAULT_PORT = 4173
MAX_PORT_ATTEMPTS = 15


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def get_app_dir() -> Path:
    # In PyInstaller onefile mode, __file__ points to a temp extraction dir.
    # We want the folder where the EXE lives so colocated assets are found.
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def bind_server(handler: type[http.server.SimpleHTTPRequestHandler]) -> tuple[ReusableTCPServer, int]:
    for port in range(DEFAULT_PORT, DEFAULT_PORT + MAX_PORT_ATTEMPTS):
        try:
            return ReusableTCPServer(("127.0.0.1", port), handler), port
        except OSError:
            continue
    raise RuntimeError(
        f"Could not bind any port in range {DEFAULT_PORT}-{DEFAULT_PORT + MAX_PORT_ATTEMPTS - 1}."
    )


def main() -> None:
    app_dir = get_app_dir()
    os.chdir(app_dir)

    handler = http.server.SimpleHTTPRequestHandler
    httpd, port = bind_server(handler)

    with httpd:
        url = f"http://127.0.0.1:{port}/"
        print(f"Starting Wath picker at {url}")
        print("Press Ctrl+C to stop.")

        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()

        # Give server a moment to bind before opening browser.
        time.sleep(0.3)
        webbrowser.open(url)

        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
        finally:
            httpd.shutdown()


if __name__ == "__main__":
    main()
