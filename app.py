"""
app.py

Flask web interface for the Browser Use IT automation agent.

Risk levels:
    🟢 LOW RISK  — executes immediately (view, search, rename, assign, read)
    🔴 HIGH RISK — requires explicit confirm=true before executing

Feedback loop:
    After every /run response, the client receives a feedback_hint.
    POST /feedback { task, feedback: "up"|"down", old_result: {...} }
      👍 up   → log the success, return acknowledgement
      👎 down → re-run the agent, compare old vs new, return the best result

Endpoints:
    GET  /          → health check + usage
    POST /run       { "task": "...", "confirm": true|false }
    POST /feedback  { "task": "...", "feedback": "up"|"down", "old_result": {...} }
"""

import asyncio
import json
import os
from datetime import datetime

from flask import Flask, request, jsonify, render_template
from flask_socketio import SocketIO, emit       # ← WebSocket support
from browser_agent import run_task as _run_task

# ---------------------------------------------------------------------------
# User data — backed by a JSON file so agent changes persist across restarts
# ---------------------------------------------------------------------------

_USERS_FILE = "users_state.json"

_DEFAULT_USERS = [
    {"name": "John Doe",      "email": "john@company.com",    "role": "Admin",       "status": "active",   "last_active": "2 hours ago"},
    {"name": "Alice Smith",   "email": "alice@company.com",   "role": "User",        "status": "inactive", "last_active": "1 day ago"},
    {"name": "Bob Sharma",    "email": "bob@company.com",     "role": "Admin",       "status": "active",   "last_active": "30 mins ago"},
    {"name": "Carol Nguyen",  "email": "carol@company.com",   "role": "User",        "status": "active",   "last_active": "Yesterday"},
    {"name": "Eva Torres",    "email": "eva@company.com",     "role": "Viewer",      "status": "active",   "last_active": "5 mins ago"},
    {"name": "Frank Liu",     "email": "frank@company.com",   "role": "User",        "status": "active",   "last_active": "1 hour ago"},
    {"name": "Grace Okafor",  "email": "grace@company.com",   "role": "Super Admin", "status": "active",   "last_active": "Just now"},
    {"name": "Henry Walsh",   "email": "henry@company.com",   "role": "User",        "status": "inactive", "last_active": "1 week ago"},
]

def _load_users():
    """Load users from file, fall back to defaults if file missing."""
    if os.path.exists(_USERS_FILE):
        try:
            with open(_USERS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    # First time — write defaults to disk
    _save_users(_DEFAULT_USERS)
    return [dict(u) for u in _DEFAULT_USERS]

def _save_users(users):
    """Write current user list to disk."""
    with open(_USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)

# Live mutable list — updated by agent actions and persisted immediately
_ADMIN_USERS = _load_users()

app = Flask(__name__)
app.config['SERVER_NAME'] = None

# Allow all origins so any frontend can connect over WebSocket
socketio = SocketIO(app, cors_allowed_origins="*")

# File used to persist all feedback entries
FEEDBACK_LOG = "feedback_log.json"


# ---------------------------------------------------------------------------
# Risk detection
# ---------------------------------------------------------------------------

_HIGH_RISK_KEYWORDS = [
    "reset password",
    "delete user",
    "remove user",
    "disable account",
    "revoke access",
]


def is_high_risk(task: str) -> bool:
    """Returns True if the task contains a high-risk action keyword."""
    return any(k in task.lower() for k in _HIGH_RISK_KEYWORDS)


# ---------------------------------------------------------------------------
# Best-result selector
# ---------------------------------------------------------------------------

def choose_best(old: dict, new: dict) -> dict:
    """
    Compare two execution results and return the better one.

    Criteria (in priority order):
      1. Prefer a completed status over non-completed
      2. Prefer fewer steps (less browser work done = more efficient script)
      3. Fall back to the new result
    """
    old_ok = (old or {}).get("status") == "completed"
    new_ok = (new or {}).get("status") == "completed"

    if new_ok and not old_ok:
        return new
    if old_ok and not new_ok:
        return old

    # Both completed — prefer fewer steps
    old_steps = (old or {}).get("steps") or float("inf")
    new_steps = (new or {}).get("steps") or float("inf")

    return new if new_steps <= old_steps else old


# ---------------------------------------------------------------------------
# Feedback logger
# ---------------------------------------------------------------------------

def _log_feedback(task: str, feedback: str, result: dict, note: str = ""):
    """Append a feedback entry to feedback_log.json."""
    entry = {
        "time":     datetime.now().isoformat(timespec="seconds"),
        "task":     task,
        "feedback": feedback,   # "up" or "down"
        "note":     note,
        "result":   result,
    }

    # Load existing log (create if missing)
    if os.path.exists(FEEDBACK_LOG):
        with open(FEEDBACK_LOG, "r", encoding="utf-8") as f:
            try:
                log = json.load(f)
            except json.JSONDecodeError:
                log = []
    else:
        log = []

    log.append(entry)

    with open(FEEDBACK_LOG, "w", encoding="utf-8") as f:
        json.dump(log, f, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# WebSocket helpers & events
# ---------------------------------------------------------------------------

def emit_progress(message: str):
    """Convenience wrapper — emits a progress update to the connected client."""
    emit("progress", {"message": message})


@socketio.on("run_task")
def ws_run_task(data):
    """
    WebSocket event: "run_task"

    Expected payload: { "task": "<task description>" }

    Flow:
      1. Emit staged progress updates so the frontend feels alive.
      2. Call the existing async agent (run_task in browser_agent.py).
      3. Emit "done" with the final result, or "error" on failure.
    """
    data = data or {}
    task = data.get("task", "").strip()
    confirm = data.get("confirm", False)

    if not task:
        emit("error", {"message": "Missing 'task' in payload"})
        return

    # ── Local short-circuit: answer simple non-task messages instantly ──
    _GREETINGS = {"hi", "hello", "hey", "yo", "sup", "hola", "help", "?"}
    if task.lower().strip("!.,") in _GREETINGS or len(task.split()) <= 2 and not any(
        k in task.lower() for k in _HIGH_RISK_KEYWORDS + ["reset", "create", "delete", "assign", "view", "search", "disable"]
    ):
        emit("done", {
            "session_id": "local",
            "status": "completed",
            "cache": "LOCAL",
            "steps": 0,
            "output": (
                "👋 Hi! I'm your **IT Automation Agent**.\n\n"
                "Tell me what to do on the admin panel, for example:\n"
                "- `Reset password for john@company.com`\n"
                "- `Disable account for alice@company.com`\n"
                "- `View all active users`"
            ),
        })
        return

    # 🔴 High risk check for WebSocket
    if is_high_risk(task) and not confirm:
        emit("confirmation_required", {"task": task})
        return

    try:
        client_sid = request.sid
        def sync_emit(step_msg):
            socketio.emit("progress", {"message": f"🤖 {step_msg}"}, to=client_sid)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(_run_task(task, on_progress=sync_emit))
        finally:
            loop.close()

        emit("done", result)

    except Exception as e:
        emit("error", {"message": str(e)})


# ---------------------------------------------------------------------------
# REST Routes (unchanged)
# ---------------------------------------------------------------------------

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "status":  "ok",
        "service": "Deca IT Automation Agent",
        "usage": {
            "run": {
                "method":  "POST /run",
                "body":    {"task": "string", "confirm": "bool (for high-risk)"}
            },
            "feedback": {
                "method":  "POST /feedback",
                "body":    {"task": "string", "feedback": "up | down", "old_result": "{}"}
            }
        }
    })


@app.route("/admin", methods=["GET"])
def admin():
    """Render the agent-facing admin panel UI."""
    return render_template("admin.html", users=_ADMIN_USERS)


@app.route("/api/toggle_user", methods=["POST"])
def api_toggle_user():
    """Toggle user status and PERSIST to disk so changes survive restarts."""
    data = request.get_json(force=True, silent=True) or {}
    email = data.get("email", "").lower()
    for u in _ADMIN_USERS:
        if u["email"].lower() == email:
            u["status"] = "inactive" if u["status"] == "active" else "active"
            _save_users(_ADMIN_USERS)   # <-- write to disk immediately
            return jsonify({"status": "success", "new_status": u["status"]})
    return jsonify({"error": "not found"}), 404


@app.route("/run", methods=["POST"])
def run():
    data = request.get_json(force=True, silent=True) or {}
    task = data.get("task", "").strip()

    if not task:
        return jsonify({"error": "Missing 'task' field in request body"}), 400

    # 🔴 HIGH RISK — block until user explicitly confirms
    if is_high_risk(task) and not data.get("confirm"):
        return jsonify({
            "status":  "confirmation_required",
            "risk":    "HIGH",
            "message": f"High-risk action detected: '{task}'",
            "hint":    "Resend with { \"confirm\": true } to proceed"
        }), 202

    # 🟢 Execute (low risk, or confirmed high risk)
    result = asyncio.run(_run_task(task))

    return jsonify({
        "status":        "completed",
        "risk":          "HIGH" if is_high_risk(task) else "LOW",
        "task":          task,
        "result":        result,
        # Feedback hint shown to the client after every run
        "feedback_hint": "👍 thumbs_up  |  👎 thumbs_down  →  POST /feedback"
    })


@app.route("/feedback", methods=["POST"])
def feedback():
    """
    Feedback loop endpoint.

    👍 up   → log the good run; return acknowledgement
    👎 down → re-run the agent, compare old vs new, return the best result
    """
    data     = request.get_json(force=True, silent=True) or {}
    task     = (data.get("task") or "").strip()
    fb       = (data.get("feedback") or "").strip().lower()
    old_result = data.get("old_result") or {}

    if not task:
        return jsonify({"error": "Missing 'task'"}), 400
    if fb not in ("up", "down"):
        return jsonify({"error": "feedback must be 'up' or 'down'"}), 400

    # ── 👍 THUMBS UP ─────────────────────────────────────────────────────────
    if fb == "up":
        _log_feedback(task, "up", old_result, note="User confirmed good result")
        return jsonify({
            "message":  "Thanks! Marked as successful. ✅",
            "feedback": "up"
        })

    # ── 👎 THUMBS DOWN — retry + compare ────────────────────────────────────
    print(f"\n[feedback] 👎 Retrying task: {task}")
    new_result = asyncio.run(_run_task(task))

    best   = choose_best(old_result, new_result)
    winner = "new" if best is new_result else "old"

    _log_feedback(
        task, "down", best,
        note=f"Retried after thumbs-down. Best result: {winner} run "
             f"(old_steps={old_result.get('steps')}, new_steps={new_result.get('steps')})"
    )

    return jsonify({
        "message":    f"Retried and selected the better result ({winner} run). 🔄",
        "feedback":   "down",
        "old_result": old_result,
        "new_result": new_result,
        "best_result": best,
        "winner":     winner
    })


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Use socketio.run so WebSocket upgrades are handled correctly;
    # all existing HTTP routes continue to work as before.
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, allow_unsafe_werkzeug=True)
