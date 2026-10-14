#!/usr/bin/env python3
"""Exercise the real Nginx config against disposable localhost upstreams only."""
import argparse
import http.client
import http.server
import json
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import threading
import time


def port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config-dir", type=Path, default=Path(__file__).resolve().parents[1] / "deploy/environment-isolation")
    parser.add_argument("--nginx", default=shutil.which("nginx") or "/usr/sbin/nginx")
    args = parser.parse_args()
    seen = []
    servers = []
    for environment in ("release", "develop", "trial"):
        def handler(name):
            class Stub(http.server.BaseHTTPRequestHandler):
                def do_GET(self):
                    seen.append((name, self.command, self.path))
                    body = json.dumps({"environment": name, "path": self.path, "declaration": self.headers.get("X-MiniProgram-Env"), "debugIdentity": self.headers.get("X-User-Id")}).encode()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                do_POST = do_GET
                def log_message(self, *_):
                    pass
            return Stub
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler(environment))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        servers.append(server)
    release_port, develop_port, trial_port = [s.server_port for s in servers]
    proxy_port = port()
    with tempfile.TemporaryDirectory(prefix="fcm-proxy-check-") as directory:
        root = Path(directory)
        locations = (args.config_dir / "nginx-locations.conf").read_text().replace("127.0.0.1:3101", f"127.0.0.1:{develop_port}").replace("127.0.0.1:3102", f"127.0.0.1:{trial_port}")
        guard = (args.config_dir / "nginx-release-guard.conf").read_text()
        release_guard = (args.config_dir / "nginx-release-location.conf").read_text()
        config = root / "nginx.conf"
        config.write_text(f"""pid {root}/nginx.pid;
error_log {root}/error.log;
events {{ worker_connections 32; }}
http {{
  access_log off;
  client_body_temp_path {root}/body;
  proxy_temp_path {root}/proxy;
  {guard}
  server {{
    listen 127.0.0.1:{proxy_port};
    {locations}
    location / {{
      {release_guard}
      proxy_pass http://127.0.0.1:{release_port};
    }}
  }}
}}
""")
        subprocess.run([args.nginx, "-t", "-c", str(config), "-p", str(root)], check=True, capture_output=True)
        process = subprocess.Popen([args.nginx, "-c", str(config), "-p", str(root), "-g", "daemon off;"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            for _ in range(100):
                if process.poll() is not None:
                    raise RuntimeError((root / "error.log").read_text())
                try:
                    with socket.create_connection(("127.0.0.1", proxy_port), timeout=.1):
                        break
                except OSError:
                    time.sleep(.03)
            def request(path, headers=None, method="GET"):
                connection = http.client.HTTPConnection("127.0.0.1", proxy_port, timeout=3)
                try:
                    connection.request(method, path, headers=headers or {})
                    response = connection.getresponse()
                    return response.status, response.read()
                finally:
                    connection.close()
            formal = "https://servicewechat.com/wx4c588cd106e520e0/123/page-frame.html"
            app_path = "/clubs/example/app-clients/example/write"
            assert request("/health")[0] == 200
            assert request(app_path, {"Referer": formal})[0] == 200
            before = len(seen)
            for headers in ({}, {"X-MiniProgram-Env": "trial", "Referer": formal}, {"X-MiniProgram-Env": "develop", "Referer": formal}, {"X-MiniProgram-Env": "release"}, {"Referer": formal.replace("/123/", "/0/")}, {"Referer": formal.replace("/123/", "/devtools/")}, {"Referer": formal + "?spoof=1"}):
                assert request(app_path, headers, "POST")[0] == 403, headers
            assert len(seen) == before, "Rejected writes reached an upstream"
            for env in ("develop", "trial"):
                status, body = request(f"/__env/{env}/probe", {"X-MiniProgram-Env": env, "X-User-Id": "must-be-stripped"})
                value = json.loads(body)
                assert status == 200 and value["environment"] == env and value["path"] == "/probe"
                assert value["declaration"] == env and value["debugIdentity"] is None
            before = len(seen)
            for path in ("/__env", "/__env/staging/probe", "/__env/trial", "/__environment/probe"):
                assert request(path)[0] == 404
            assert len(seen) == before
            servers[2].shutdown()
            servers[2].server_close()
            before = len(seen)
            assert request("/__env/trial/probe", {"X-MiniProgram-Env": "trial"})[0] == 502
            assert len(seen) == before, "Unavailable trial fell through to production"
            print(json.dumps({"passed": True, "productionAccessed": False, "checks": ["nginx syntax", "formal compatibility", "legacy development/trial rejected before upstream", "fixed isolated upstreams", "debug identity stripped", "unknown environments closed", "no production fallback"]}))
        finally:
            process.terminate()
            process.wait(timeout=5)
            for server in servers:
                server.shutdown()
                server.server_close()


if __name__ == "__main__":
    main()
