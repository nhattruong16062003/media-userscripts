"""Compatibility entry: the canonical bundler is at ../../scripts/build.mjs."""
from pathlib import Path
import subprocess
import sys
root = Path(__file__).resolve().parents[2]
raise SystemExit(subprocess.call(["node", str(root / "scripts" / "build.mjs"), *sys.argv[1:]], cwd=root))
