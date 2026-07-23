import asyncio
import json
import shutil
from collections.abc import AsyncIterator


class ClaudeCliNotFound(RuntimeError):
    pass


async def stream_query(
    prompt: str,
    *,
    include_partial_messages: bool = False,
    cwd: str | None = None,
    session_id: str | None = None,
    resume: bool = False,
    append_system_prompt: str | None = None,
) -> AsyncIterator[dict]:
    """Shell out to the local `claude` CLI and yield its stream-json events.

    Deliberately omits --bare so the call rides the caller's own `claude
    login` session (same credentials as interactive Claude Code) instead of
    requiring a separate ANTHROPIC_API_KEY.

    `session_id` + `resume` give a caller multi-turn continuity: pass
    `session_id` alone on the first call of a conversation to name the
    session, then pass the same `session_id` with `resume=True` on every
    later call so the CLI has the prior turns as context.
    """
    claude_path = shutil.which("claude")
    if not claude_path:
        raise ClaudeCliNotFound(
            "Claude CLI not found on PATH. Install it with "
            "`npm install -g @anthropic-ai/claude-code` and run `claude login`."
        )

    args = [claude_path, "-p", prompt, "--output-format", "stream-json", "--verbose"]
    if include_partial_messages:
        args.append("--include-partial-messages")
    if session_id and resume:
        args += ["--resume", session_id]
    elif session_id:
        args += ["--session-id", session_id]
    if append_system_prompt:
        args += ["--append-system-prompt", append_system_prompt]

    proc = await asyncio.create_subprocess_exec(
        *args,
        cwd=cwd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        assert proc.stdout is not None
        async for raw in proc.stdout:
            line = raw.decode("utf-8", errors="replace").strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue

        await proc.wait()
    finally:
        # If the consumer stops early (e.g. a disconnected WebSocket closes
        # this generator), don't leave the CLI process running.
        if proc.returncode is None:
            proc.kill()
            await proc.wait()
