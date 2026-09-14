"""Port quota.ts."""
from __future__ import annotations
import re

def is_quota_error(error: Exception | dict | None) -> bool:
    status = None
    message = str(error) if error is not None else ""
    if isinstance(error, dict):
        status = error.get("status")
        message = str(error)
    elif hasattr(error, "status"):
        status = getattr(error, "status")
    elif hasattr(error, "code"):
        status = getattr(error, "code")
    if status in (402, 429):
        return True
    return bool(re.search(r"insufficient_quota|quota|rate.?limit|billing", message, re.I))
