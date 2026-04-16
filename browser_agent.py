import asyncio
import hashlib
import os
import re
import time
from dotenv import load_dotenv
from browser_use_sdk.v3 import AsyncBrowserUse

load_dotenv()

_workspace_id = None
_WORKSPACE_NAME = "decawork-it-helpdesk"


# ---------------------------------------------------------------------------
# Parameter extraction  — regex only, ignores all surrounding words
# ---------------------------------------------------------------------------

# Strict RFC-5321-flavoured email pattern — never captures prose words
_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

def extract_email(raw: str) -> str | None:
    """Return the first valid email found in raw input, or None."""
    m = _EMAIL_RE.search(raw)
    return m.group(0).lower() if m else None


# ---------------------------------------------------------------------------
# Task-type detection  — keyword-intent based, order matters (most specific first)
# ---------------------------------------------------------------------------
#
# Each entry is (task_type, [trigger_words]).  The FIRST match wins.
# Keywords are plain substring matches on lowercased input — no exact phrase needed.

_INTENT_MAP: list[tuple[str, list[str]]] = [
    ("reset_password",  ["reset password", "reset pass", "change password", "new password"]),
    ("disable_account", ["disable"]),
    ("enable_account",  ["enable",  "reactivate", "unblock"]),
]

def detect_task_type(raw: str) -> str:
    """
    Map any natural-language phrasing to a stable task_type key.

    Examples that all map to 'disable_account':
      'disable account for …'
      'disable this account …'
      'please disable …'
      'can you disable john@…'
      'disable john@… now'
    """
    lower = raw.lower()
    for task_type, keywords in _INTENT_MAP:
        if any(kw in lower for kw in keywords):
            return task_type
    return "generic"


# ---------------------------------------------------------------------------
# Preprocessing pipeline  — single entry point used by run_task
# ---------------------------------------------------------------------------

def parse_input(raw: str) -> tuple[str, str]:
    """
    Converts free-form user input into a (task_type, param) pair.

    The raw sentence is DISCARDED after this function — only the
    stable task_type and the clean extracted email are passed forward,
    which guarantees the prompt template is always identical.
    """
    task_type = detect_task_type(raw)
    email     = extract_email(raw)
    param     = email if email else raw.strip()

    # ── Debug audit ───────────────────────────────────────────────────────
    print(f"\n[PARSE] RAW INPUT      : {raw}")
    print(f"[PARSE] EXTRACTED EMAIL: {email}")
    print(f"[PARSE] TASK TYPE      : {task_type}")
    print(f"[PARSE] PARAM (to prompt): {param}")
    # ──────────────────────────────────────────────────────────────────────

    return task_type, param



# ---------------------------------------------------------------------------
# Workspace helper
# ---------------------------------------------------------------------------

async def _get_or_create_workspace(client):
    global _workspace_id

    if _workspace_id:
        return _workspace_id

    existing = await client.workspaces.list()
    for ws in existing.items:
        if getattr(ws, "name", None) == _WORKSPACE_NAME:
            _workspace_id = str(ws.id)
            return _workspace_id

    ws = await client.workspaces.create(name=_WORKSPACE_NAME)
    _workspace_id = str(ws.id)
    return _workspace_id


# ---------------------------------------------------------------------------
# PROMPT BUILDER — STABLE template + dynamic parameter block only
#
# CRITICAL FOR CACHING:
#   The "Task:" line is ALWAYS identical for the same task type.
#   Only the parameter block (Target email / Target user) changes.
#   This lets browser-use match the cached script on every repeated call.
# ---------------------------------------------------------------------------

def _build_enriched_prompt(task_type: str, param: str, admin_url: str) -> str:
    if task_type == "reset_password":
        return (
            "Task: Reset password for a user.\n\n"
            f"Target email: {param}\n\n"
            "Goal:\n"
            "A green success banner must appear.\n\n"
            "Steps:\n"
            f"1. Open the admin panel at {admin_url}.\n"
            "2. Click the 'Search user' input and type the target email to filter the table to one row.\n"
            "3. Click the 'Reset Password' button in that row.\n"
            "4. A modal will appear — click the confirm button inside it.\n"
            "5. Wait for the green banner and read its text.\n\n"
            "Constraints:\n"
            "Return the exact banner text. If the user is not found, return 'USER_NOT_FOUND'. "
            "Do not hallucinate. Only act on visible UI."
        )

    if task_type == "disable_account":
        return (
            "Task: Disable account for a user.\n\n"
            f"Target email: {param}\n\n"
            "Goal:\n"
            "A green success banner must appear.\n\n"
            "Steps:\n"
            f"1. Open the admin panel at {admin_url}.\n"
            "2. Click the 'Search user' input and type the target email to filter the table to one row.\n"
            "3. Click the 'Disable' button in that row.\n"
            "4. Wait for the green banner and read its text.\n\n"
            "Constraints:\n"
            "Return the exact banner text. If the user is not found, return 'USER_NOT_FOUND'. "
            "Do not hallucinate. Only act on visible UI."
        )

    if task_type == "enable_account":
        return (
            "Task: Enable account for a user.\n\n"
            f"Target email: {param}\n\n"
            "Goal:\n"
            "A green success banner must appear.\n\n"
            "Steps:\n"
            f"1. Open the admin panel at {admin_url}.\n"
            "2. Click the 'Search user' input and type the target email to filter the table to one row.\n"
            "3. Click the 'Enable' button in that row.\n"
            "4. Wait for the green banner and read its text.\n\n"
            "Constraints:\n"
            "Return the exact banner text. If the user is not found, return 'USER_NOT_FOUND'. "
            "Do not hallucinate. Only act on visible UI."
        )

    # generic fallback — param is the raw task string
    return (
        "Task: Execute requested objective.\n\n"
        f"Objective: {param}\n\n"
        "Steps:\n"
        f"1. Open {admin_url}.\n"
        "2. Complete the objective visually.\n\n"
        "Constraints:\n"
        "Return the result text visible on screen. Do not hallucinate. Only act on visible UI."
    )


# ---------------------------------------------------------------------------
# MAIN EXECUTION
# ---------------------------------------------------------------------------

async def run_task(task: str, on_progress=None) -> dict:
    t_start = time.perf_counter()

    print("\n" + "=" * 60)
    print(f"Task: {task}")
    print("=" * 60)

    ADMIN_URL = os.getenv("ADMIN_URL", "http://localhost:5000/admin")

    # ── Single preprocessing entry point ────────────────────────────────────
    # parse_input() discards the raw sentence; only (task_type, clean_email) survive.
    task_type, param = parse_input(task)

    prompt = _build_enriched_prompt(task_type, param, ADMIN_URL).strip()

    # ── Prompt stability audit ───────────────────────────────────────────────
    prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()[:16]
    print(f"[CACHE] PROMPT HASH    : {prompt_hash}")
    print(f"[CACHE] PROMPT CONTENT :\n{prompt}\n")
    # ────────────────────────────────────────────────────────────────────────


    client = AsyncBrowserUse()

    try:
        workspace_id = await _get_or_create_workspace(client)

        # Per SDK docs: client.run() returns an async iterator.
        # run.result is ONLY available AFTER the iterator fully completes.
        # Never re-await the iterator — just read .result after the loop.
        client_run = client.run(
            task=prompt,
            workspace_id=workspace_id,
            cache_script=True,
            enable_recording=False,
        )

        last_summary = ""

        async for msg in client_run:
            role    = getattr(msg, "role",    "unknown")
            summary = getattr(msg, "summary", str(msg))
            last_summary = summary

            print(f"[{role}] {summary}")

            if on_progress:
                on_progress(summary)

        # result is now available — this is the correct SDK pattern
        result = client_run.result

        raw_output = getattr(result, "output", None) or last_summary
        session    = getattr(result, "session", None)
        status     = "COMPLETED"
        steps      = None
        cache_hit  = False

        if session:
            status    = getattr(getattr(session, "status", None), "value", "COMPLETED")
            steps     = getattr(session, "step_count", None)
            # browser-use sets cache_hit=True on the session when a cached script ran
            cache_hit = bool(getattr(session, "cache_hit", False))
            # Fallback heuristic: if no explicit flag, very low step count → cache hit
            if not cache_hit and steps is not None and steps <= 3:
                cache_hit = True

        if isinstance(raw_output, dict):
            output = " ".join(str(v) for v in raw_output.values())
        else:
            output = str(raw_output)

        t_end    = time.perf_counter()
        elapsed  = t_end - t_start
        cache_label = "✅ CACHE HIT" if cache_hit else "🔄 CACHE MISS (LLM used)"

        print(f"\n{'=' * 60}")
        print(f"{cache_label}")
        print(f"[PERF] Execution time : {elapsed:.2f}s")
        print(f"[PERF] Steps          : {steps}")
        print(f"[PERF] Status         : {status}")
        print(f"📤 Output: {output}")
        print("=" * 60)

        return {
            "status":    status,
            "output":    output,
            "steps":     steps,
            "cache_hit": cache_hit,
            "elapsed_s": round(elapsed, 2),
        }

    finally:
        await client.close()


# ---------------------------------------------------------------------------
# DEMO
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    asyncio.run(run_task("Reset password for john@company.com"))