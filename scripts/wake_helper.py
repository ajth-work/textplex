from __future__ import annotations

import argparse
import json
import os
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 8787
DEFAULT_API_HEALTH_URL = "http://127.0.0.1:8000/health"


class WakeHelperHandler(BaseHTTPRequestHandler):
    server_version = "TextPlexWakeHelper/0.1"

    def do_OPTIONS(self) -> None:  # noqa: N802
      self.send_response(204)
      self._send_cors_headers()
      self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path not in {"/", "/health"}:
            self._json_response(404, {"status": "error", "message": "Not found"})
            return

        payload = self.server.helper_status()
        self._json_response(200 if payload["status"] != "error" else 503, payload)

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/wake":
            self._json_response(404, {"status": "error", "message": "Not found"})
            return

        payload = self.server.wake_processor()
        self._json_response(200 if payload["status"] != "error" else 503, payload)

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        return

    def _json_response(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Accept")


class WakeHelperServer(ThreadingHTTPServer):
    def __init__(self, server_address: tuple[str, int], helper_root: Path, api_health_url: str) -> None:
        super().__init__(server_address, WakeHelperHandler)
        self.helper_root = helper_root
        self.api_health_url = api_health_url

    def helper_status(self) -> dict[str, Any]:
        docker_ok, docker_message = self._probe_docker()
        api_ok, api_message = self._probe_api()
        status = "ok" if docker_ok and api_ok else "degraded"
        if not docker_ok:
            status = "error"
        elif not api_ok:
            status = "degraded"
        return {
            "status": status,
            "docker_ok": docker_ok,
            "docker_message": docker_message,
            "api_ok": api_ok,
            "api_message": api_message,
            "api_health_url": self.api_health_url,
            "wake_command": "docker compose up -d api",
        }

    def wake_processor(self) -> dict[str, Any]:
        docker_ok, docker_message = self._probe_docker()
        if not docker_ok:
            return {
                "status": "error",
                "message": docker_message,
            }

        result = subprocess.run(
            ["docker", "compose", "up", "-d", "api"],
            cwd=str(self.helper_root),
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            return {
                "status": "error",
                "message": "Unable to start the processor container.",
                "stdout": result.stdout.strip(),
                "stderr": result.stderr.strip(),
            }

        api_ok, api_message = self._probe_api()
        return {
            "status": "ok" if api_ok else "degraded",
            "message": "Wake command sent.",
            "api_ok": api_ok,
            "api_message": api_message,
        }

    def _probe_docker(self) -> tuple[bool, str]:
        result = subprocess.run(
            ["docker", "version"],
            cwd=str(self.helper_root),
            capture_output=True,
            text=True,
            check=False,
            timeout=10,
        )
        if result.returncode != 0:
            stderr = result.stderr.strip() or result.stdout.strip() or "Docker is unavailable."
            return False, stderr
        return True, "Docker is available."

    def _probe_api(self) -> tuple[bool, str]:
        try:
            request = Request(self.api_health_url, headers={"Accept": "application/json"})
            with urlopen(request, timeout=3) as response:
                body = response.read().decode("utf-8")
            payload = json.loads(body)
            if payload.get("status") == "ok":
                return True, "Processor API responded with ok."
            return False, f"Unexpected health payload: {payload!r}"
        except (URLError, TimeoutError, ValueError) as error:
            return False, f"Processor API is unreachable: {error}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the lightweight TextPlex wake helper.")
    parser.add_argument("--host", default=os.getenv("TEXTPLEX_WAKE_HOST", DEFAULT_HOST))
    parser.add_argument("--port", default=int(os.getenv("TEXTPLEX_WAKE_PORT", str(DEFAULT_PORT))), type=int)
    parser.add_argument(
        "--api-health-url",
        default=os.getenv("TEXTPLEX_API_HEALTH_URL", DEFAULT_API_HEALTH_URL),
        help="Health endpoint for the processor API.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    server = WakeHelperServer((args.host, args.port), ROOT, args.api_health_url)
    print(f"TextPlex wake helper listening on http://{args.host}:{args.port}")
    print(f"Processor health URL: {args.api_health_url}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
