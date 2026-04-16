import asyncio
import os
import re
from dotenv import load_dotenv
from browser_use_sdk.v3 import AsyncBrowserUse

load_dotenv()

_workspace_id = None
_WORKSPACE_NAME = "decawork-it-helpdesk"


# ---------------------------------------------------------------------------
# Parameter extraction
# ---------------------------------------------------------------------------

_EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w.-]+\.\w+\b")

def extract_email(task: str) -> str | None:
    """Pull the first email address out of a raw user task string."""
    m = _EMAIL_RE.search(task)
    return m.group(0) if m else None


# ---------------------------------------------------------------------------
# Task type detection
# ---------------------------------------------------------------------------

_TASK_TYPES = {
    "reset_password": ["reset password", "reset pass", "change password"],
    "disable_account": ["disable account", "disable user", "disable "],
    "enable_account":  ["enable account",  "enable user",  "enable "],
}

def detect_task_type(task: str) -> str:
    """Return a stable task-type key, or 'generic' if no match."""
    lower = task.lower()
    for task_type, keywords in _TASK_TYPES.items():
        if any(kw in lower for kw in keywords):
            return task_type
    return "generic"


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
    print("\n" + "=" * 60)
    print(f"Task: {task}")
    print("=" * 60)

    ADMIN_URL = os.getenv("ADMIN_URL", "http://localhost:5000/admin")

    task_type = detect_task_type(task)
    email     = extract_email(task)
    param     = email if email else task   # generic fallback uses raw task

    prompt = _build_enriched_prompt(task_type, param, ADMIN_URL).strip()

    print(f"task_type={task_type}  param={param}")

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
            role = getattr(msg, "role", "unknown")
            summary = getattr(msg, "summary", str(msg))
            last_summary = summary

            print(f"[{role}] {summary}")

            if on_progress:
                on_progress(summary)

        # result is now available — this is the correct SDK pattern
        result = client_run.result

        raw_output = getattr(result, "output", None) or last_summary
        session = getattr(result, "session", None)
        status = "COMPLETED"
        steps = None

        if session:
            status = getattr(getattr(session, "status", None), "value", "COMPLETED")
            steps = getattr(session, "step_count", None)

        if isinstance(raw_output, dict):
            output = " ".join(str(v) for v in raw_output.values())
        else:
            output = str(raw_output)

        print(f"\n✅ Done | status={status} | steps={steps}")
        print(f"📤 Output: {output}")

        return {
            "status": status,
            "output": output,
            "steps": steps,
        }

    finally:
        await client.close()


# ---------------------------------------------------------------------------
# DEMO
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    asyncio.run(run_task("Reset password for john@company.com"))