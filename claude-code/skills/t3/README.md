# /t3 for Claude Code

Type `/t3` in a Claude Code chat and the same chat opens in the [T3 Code](https://github.com/pingdotgg/t3code) desktop app. It's like Claude Code's `/desktop`, but for T3 Code.

## Install

Requirements: macOS, Node 22 or later, and the T3 Code desktop app with its `t3` command installed (T3 Code: Settings, About, t3 command).

```bash
git clone https://github.com/hamzafer/cursor-commands
mkdir -p ~/.claude/skills
cp -R cursor-commands/claude-code/skills/t3 ~/.claude/skills/t3
```

Restart Claude Code (or run `/reload-skills`), then type `/t3` in any chat.

## What happens

1. The script reads the chat's session ID and finds its transcript in `~/.claude/projects`.
2. If T3 doesn't have the chat yet, it signs in to the running T3 with a 5-minute token and runs T3's own importer, the same one behind the Import button on T3's Welcome page. If T3 doesn't know the chat's folder, it adds it as a project first. The token is revoked right after.
3. It opens the chat with a `t3code://threads/...` link.
4. Claude reminds you to type `/exit` in the terminal.

## Before you use it

- **Exit the terminal before typing in T3.** Both write to the same transcript. If both continue from the same message, the chat splits into two branches that can't see each other's new messages.
- **Code Mode chats can't move.** Chats started with `CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1` can only be resumed in the terminal for now. `/t3` checks for this and stops.
- **T3 shows the chat as of its first import.** Running `/t3` again later won't add the newer messages to T3's view. Claude still loads the full chat when you continue in T3.
- **T3 imports the whole folder.** Its importer brings in every recent chat from the chat's folder, not just this one.
- **Only the last 30 days.** T3 doesn't import older chats.

## A second Claude account

If you run another account with `CLAUDE_CONFIG_DIR` (for example `~/.claude-work`):

1. In T3, open Settings, Providers, Add provider, pick Claude and set `CLAUDE_CONFIG_DIR path` to that folder.
2. Copy this folder into that account's `skills` folder as well.

`/t3` picks the T3 provider that matches the chat's account.

## Uninstall

Delete `~/.claude/skills/t3`.
