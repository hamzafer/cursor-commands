---
name: t3
description: Open the current Claude Code chat in the T3 Code desktop app, importing it first if needed. Use only when the user types /t3.
disable-model-invocation: true
---

# /t3: continue this chat in T3 Code

1. Run the script from the shell (it reads `CLAUDE_CODE_SESSION_ID` itself):

   ```bash
   node ~/.claude/skills/t3/t3-open.mjs
   ```

2. It prints one JSON line.
   - `ok: true`: T3 Code now shows this chat. Tell the user in one or two short lines: it's open in T3 (in the project for `folder`), and to type `/exit` here before sending anything in T3, because the chat can't run in two places at once.
     - If `alreadyInT3` is true, add one line: T3 shows the chat as it was when it was first imported. Claude still gets the full conversation when they continue there.
   - `ok: false`: show the `error` text and stop. Don't retry or try other ways in.

Don't do anything else in this turn.
