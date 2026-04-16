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
_AGENT_VERSION = "v3.1-strict"  # Bump this on every deploy to verify Render picked it up


# ---------------------------------------------------------------------------
# Parameter extraction  — regex is the ONLY source for email values
# ---------------------------------------------------------------------------

# Strict email-only regex — anchored to word boundaries, no spaces possible
_EMAIL_RE = re.compile(r"\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b")

def extract_email(raw: str) -> str | None:
    """
    Extract and clean the first valid email from raw input.

    Double-validates: runs regex on the match itself to guarantee
    no surrounding prose leaks through (e.g. 'this account eva@co.com').
    Always returns a lowercase, whitespace-free email string or None.
    """
    m = _EMAIL_RE.search(raw)
    if not m:
        return None
    candidate = m.group(0).strip().lower()
    # Sanity: re-validate the candidate — must still be a clean email
    if not _EMAIL_RE.fullmatch(candidate):
        return None
    # Hard guard: a valid email NEVER contains a space
    if " " in candidate:
        return None
    return candidate


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

# Action task types that REQUIRE an email — generic tasks do not
_ACTION_TYPES = {"reset_password", "disable_account", "enable_account"}

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
# Preprocessing pipeline  — SINGLE entry point, raw input never leaves here
# ---------------------------------------------------------------------------

class ParseError(ValueError):
    """Raised when input cannot be safely parsed into a clean (task_type, email)."""


def parse_input(raw: str) -> tuple[str, str]:
    """
    Convert free-form user input into a (task_type, clean_email) pair.

    CONTRACT — strictly enforced:
      - raw is consumed HERE and deleted before returning.
      - For ALL action tasks, a valid email is REQUIRED or ParseError is raised.
      - param returned is ONLY a bare email address — no surrounding words.
      - The LLM is NEVER called if this function raises.
    """
    # Step 1 — detect intent from raw (keyword only, no prose passed forward)
    task_type = detect_task_type(raw)

    # Step 2 — extract email via regex (regex is the ONLY source of truth)
    _raw_match = _EMAIL_RE.search(raw)
    email: str | None = None
    if _raw_match:
        _candidate = _raw_match.group(0).strip().lower()  # strip + lowercase
        # Triple-validate: fullmatch ensures no trailing/leading junk
        if _EMAIL_RE.fullmatch(_candidate) and "@" in _candidate and " " not in _candidate:
            email = _candidate

    # Step 3 — DEBUG (printed BEFORE validation so we can diagnose failures)
    print(f"\n[PARSE] RAW INPUT      : {raw}")
    print(f"[PARSE] TASK TYPE      : {task_type}")
    print(f"[PARSE] EXTRACTED EMAIL: {email}")

    # Step 4 — DELETE raw so it CANNOT leak further
    del raw

    # Step 5 — enforce requirements
    if task_type in _ACTION_TYPES:
        if email is None:
            raise ParseError(
                f"Could not find a valid email address for action '{task_type}'. "
                "Please include an email address (e.g. john@company.com)."
            )
        # Hard assertions — these should never fire if regex is correct,
        # but they act as a tripwire to catch any future regression.
        assert "@" in email,     f"[BUG] email missing @: {email!r}"
        assert " " not in email, f"[BUG] email contains spaces: {email!r}"
        assert len(email) > 3,   f"[BUG] email too short to be valid: {email!r}"
        param = email
    else:
        # Generic: no email required, but raw is already deleted.
        # Pass an empty string — the generic prompt doesn't use an email param.
        param = email if email else ""

    print(f"[PARSE] FINAL PARAM    : {param!r}")
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

def _build_enriched_prompt(task_type: str, email: str, admin_url: str) -> str:
    """
    Build a fully static prompt.
    'email' must already be a clean, validated email address.
    This function ONLY inserts it into the 'Target email:' line.
    """
    # Guard: reject obviously dirty params before they enter the prompt
    if task_type in _ACTION_TYPES:
        assert email and "@" in email, f"[BUG] dirty email reached prompt builder: {email!r}"
        assert " " not in email,       f"[BUG] email has spaces: {email!r}"

    if task_type == "reset_password":
        return (
            "Task: Reset password for a user.\n\n"
            f"Target email: {email}\n\n"
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
            f"Target email: {email}\n\n"
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
            f"Target email: {email}\n\n"
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

    # Generic fallback — no user prose injected; admin_url only
    return (
        "Task: Show all users on the admin panel.\n\n"
        "Steps:\n"
        f"1. Open {admin_url}.\n"
        "2. Read and return the list of all visible users.\n\n"
        "Constraints:\n"
        "Return the result text visible on screen. Do not hallucinate. Only act on visible UI."
    )


# ---------------------------------------------------------------------------
# MAIN EXECUTION
# ---------------------------------------------------------------------------

async def run_task(task: str, on_progress=None) -> dict:
    t_start = time.perf_counter()

    print("\n" + "=" * 60)
    print(f"[AGENT {_AGENT_VERSION}] Task: {task}")
    print("=" * 60)

    ADMIN_URL = os.getenv("ADMIN_URL", "http://localhost:5000/admin")

    # ── HARD SEPARATION: raw input is consumed here and never used again ────
    try:
        task_type, param = parse_input(task)
    except ParseError as exc:
        print(f"[PARSE] ❌ PARSE ERROR: {exc}")
        return {
            "status":    "error",
            "output":    str(exc),
            "steps":     0,
            "cache_hit": False,
            "elapsed_s": round(time.perf_counter() - t_start, 2),
        }
    # ────────────────────────────────────────────────────────────────────────

    prompt = _build_enriched_prompt(task_type, param, ADMIN_URL).strip()

    # ── Pre-send prompt assertions — final tripwire before LLM ─────────────
    _LEAK_WORDS = {"this", "please", "can you", "account for '", "this account"}
    for _bad in _LEAK_WORDS:
        assert _bad not in prompt.lower(), (
            f"[BUG] Prompt contains leaked prose word '{_bad}'.\n"
            f"PROMPT:\n{prompt}"
        )
    if task_type in _ACTION_TYPES:
        assert "@" in prompt, "[BUG] Action prompt missing email."
    # ────────────────────────────────────────────────────────────────────────

    # ── Prompt stability audit ───────────────────────────────────────────────
    prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()[:16]
    print(f"[CACHE] PROMPT HASH    : {prompt_hash}")
    print(f"[CACHE] FINAL EMAIL    : {param}")
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