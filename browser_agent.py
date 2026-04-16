import asyncio
import os
import re
from dotenv import load_dotenv
from browser_use_sdk.v3 import AsyncBrowserUse

load_dotenv()

_workspace_id = None
_WORKSPACE_NAME = "decawork-it-helpdesk"


# ---------------------------------------------------------------------------
# Wrap dynamic values for caching
# ---------------------------------------------------------------------------

def wrap_params(task: str) -> str:
    already_wrapped = set(re.findall(r"@\{\{([^}]+)\}\}", task))

    def wrap_email(m):
        val = m.group(1)
        return m.group(0) if val in already_wrapped else f"@{{{{{val}}}}}"

    task = re.sub(r"(?<!@\{\{)(\b[\w.+-]+@[\w.-]+\.\w+)", wrap_email, task)

    def wrap_name(m):
        val = m.group(0)
        if val in already_wrapped or len(val) <= 2:
            return val

        skip = {
            "Reset", "Create", "Delete", "Assign", "View",
            "Search", "Remove", "Navigate", "Then", "Find",
            "Click", "Open", "Wait", "Check", "Show", "List"
        }

        return val if val in skip else f"@{{{{{val}}}}}"

    task = re.sub(r"\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b", wrap_name, task)

    return task


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
# PROMPT BUILDER — Task + Goal + Strategy + Constraints
# ---------------------------------------------------------------------------

def _build_enriched_prompt(task: str, admin_url: str) -> str:
    lower = task.lower()

    if "reset password" in lower:
        target = task
        for prefix in ["reset password for ", "reset password of ", "reset the password for ", "reset pass for "]:
            if lower.startswith(prefix):
                target = task[len(prefix):].strip()
                break

        return (
            f"Task: Reset password for a user.\n\n"
            f"Target email: {target}\n\n"
            f"Goal:\n"
            f"A green success banner must appear.\n\n"
            f"Steps:\n"
            f"1. Open the admin panel at {admin_url}.\n"
            f"2. Find the row with the target email (use the 'Search user' input).\n"
            f"3. Click the 'Reset Password' button in that row.\n"
            f"4. A modal will appear. Click the confirm button.\n"
            f"5. Read success banner.\n\n"
            f"Constraints:\n"
            f"Return the exact banner text when it appears. If the user is not found in the table, return 'USER_NOT_FOUND'. Do not hallucinate. Only act on visible UI."
        )

    if "disable" in lower or "enable" in lower:
        target = task
        for prefix in ["disable account for ", "enable account for ", "disable ", "enable "]:
            if lower.startswith(prefix):
                target = task[len(prefix):].strip()
                break

        action_cmd = "Disable" if "disable" in lower else "Enable"
        
        return (
            f"Task: {action_cmd} account for a user.\n\n"
            f"Target email: {target}\n\n"
            f"Goal:\n"
            f"A green success banner must appear.\n\n"
            f"Steps:\n"
            f"1. Open the admin panel at {admin_url}.\n"
            f"2. Find the row with the target email (use the 'Search user' input).\n"
            f"3. Click the '{action_cmd}' button in that row.\n"
            f"4. Read success banner.\n\n"
            f"Constraints:\n"
            f"Return the exact banner text when it appears. If the user is not found, return 'USER_NOT_FOUND'. Do not hallucinate. Only act on visible UI."
        )

    return (
        f"Task: Execute requested objective.\n\n"
        f"Objective parameter: {task}\n\n"
        f"Steps:\n"
        f"1. Open {admin_url}.\n"
        f"2. Complete the objective visually.\n\n"
        f"Constraints:\n"
        f"Return the result text visible on screen after completing the task. Do not hallucinate. Only act on visible UI."
    )


# ---------------------------------------------------------------------------
# MAIN EXECUTION
# ---------------------------------------------------------------------------

async def run_task(task: str, on_progress=None) -> dict:
    print("\n" + "=" * 60)
    print(f"Task: {task}")
    print("=" * 60)

    ADMIN_URL = os.getenv("ADMIN_URL", "http://localhost:5000/admin")

    parameterized_task = wrap_params(task)
    prompt = _build_enriched_prompt(parameterized_task, ADMIN_URL)
    prompt = prompt.strip()

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