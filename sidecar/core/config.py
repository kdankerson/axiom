import os
import sys
from pathlib import Path


def resource_root() -> Path:
    """Root directory containing modules/ — differs between dev and a frozen build."""
    if getattr(sys, "frozen", False):
        return Path(os.environ.get("AXIOM_RESOURCE_DIR", Path(sys.executable).parent))
    return Path(__file__).resolve().parents[2]


def anthropic_api_key() -> str | None:
    return os.environ.get("ANTHROPIC_API_KEY")
