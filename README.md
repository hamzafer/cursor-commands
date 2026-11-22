# Cursor Commands

⭐ **Featured by [Cursor](https://x.com/ericzakariasson/status/1973932448200413539)**

A curated collection of Cursor slash-command prompts that give your team
reusable, version-controlled AI workflows directly inside the Cursor IDE.

🔗 Also check out [Cursor Hooks](https://github.com/hamzafer/cursor-hooks) - that runs after every file edit

## What are Cursor Commands?

Cursor Commands are reusable AI prompts saved as Markdown files in
`.cursor/commands/`. When you type `/` in Cursor's chat input, the IDE lists
every command from your project and your global library so you can insert the
prompt instantly. They act like AI-driven shortcuts that automate repetitive
tasks, reinforce team standards, and keep feedback consistent.

## Features

- **🚀 Quick access**: Type `/` to surface every command without leaving your flow
- **🔄 Reusable**: Standardize prompts for common tasks across the whole team
- **👥 Shareable**: Store commands in git so they ship with your repository
- **🎯 Focused**: Each command targets a specific workflow with clear structure
- **📝 Customizable**: Edit or extend the Markdown files to match your processes

## How commands work

Commands can live in two places:

- Project commands: Store Markdown files in `.cursor/commands` inside your repository
- Global commands: Store personal commands in `~/.cursor/commands` on your machine

Cursor automatically scans both directories when you type `/`, combines the
results, and inserts the selected command into the chat ready to run.

## How to use

1. Type `/` in Cursor's AI chat or agent input
2. Select from the available commands
3. Let the AI execute the prompt with the relevant project context

## Creating commands

- Create a `.cursor/commands` directory in your project root
- Add `.md` files with descriptive names (for example, `code-review.md`, `run-all-tests-and-fix.md`)
- Write clear Markdown instructions describing what the command should accomplish
- Open Cursor, type `/`, and choose your new command to execute it immediately

Example structure:

```text
.cursor/
└── commands/
    ├── accessibility-audit.md
    ├── add-documentation.md
    ├── add-error-handling.md
    ├── address-github-pr-comments.md
    ├── clarify-task.md
    ├── code-review.md
    ├── create-pr.md
    ├── deslop.md
    ├── docker-logs.md
    ├── database-migration.md
    ├── debug-issue.md
    ├── diagrams.md
    ├── fix-compile-errors.md
    ├── fix-git-issues.md
    ├── generate-api-docs.md
    ├── generate-pr-description.md
    ├── git-commit.md
    ├── git-push.md
    ├── light-review-existing-diffs.md
    ├── lint-fix.md
    ├── lint-suite.md
    ├── onboard-new-developer.md
    ├── optimize-performance.md
    ├── overview.md
    ├── refactor-code.md
    ├── roadmap.md
    ├── run-all-tests-and-fix.md
    ├── security-audit.md
    ├── security-review.md
    ├── setup-new-feature.md
    ├── visualize.md
    └── write-unit-tests.md
```

## Available commands

### Code quality & maintenance

- `lint-fix.md` – Automatically analyze and fix linting issues in the current file
- `lint-suite.md` – Run project linters, apply fixes, and ensure codebase meets formatting requirements
- `refactor-code.md` – Improve code quality while maintaining functionality
- `optimize-performance.md` – Analyze and optimize code performance
- `add-error-handling.md` – Implement comprehensive error handling across the change set
- `deslop.md` – Clean up AI-generated code by removing unnecessary complexity and verbosity
- `clarify-task.md` – Break down ambiguous tasks into clear, actionable steps

### Review & collaboration

- `code-review.md` – Comprehensive review checklist with structured steps and focus areas
- `address-github-pr-comments.md` – Process reviewer feedback and craft thoughtful responses
- `light-review-existing-diffs.md` – Quick pass to highlight risky diffs and cleanup items
- `create-pr.md` – Prepare a well-structured pull request with validation checklist
- `generate-pr-description.md` – Draft detailed pull-request descriptions automatically

### Testing & reliability

- `run-all-tests-and-fix.md` – Execute the full suite, triage failures, and confirm fixes
- `write-unit-tests.md` – Generate focused unit tests with proper coverage
- `debug-issue.md` – Step-by-step debugging workflow for isolating defects
- `fix-compile-errors.md` – Diagnose and resolve compilation failures quickly
- `docker-logs.md` – Tail and monitor Docker container logs for debugging

### Documentation & onboarding

- `add-documentation.md` – Capture comprehensive product or code documentation
- `generate-api-docs.md` – Produce rich API documentation with schemas and examples
- `onboard-new-developer.md` – Checklist-driven onboarding for new teammates
- `setup-new-feature.md` – Plan requirements, branching, and architecture for new work
- `visualize.md` – Generate visual diagrams and flowcharts from code or concepts
- `diagrams.md` – Generate Mermaid diagrams (flowcharts, sequence, class, ER, state diagrams)
- `overview.md` – Generate Mermaid diagrams for user journey and architecture flow
- `roadmap.md` – Analyze codebase and generate visual feature roadmaps

### Security, accessibility & infrastructure

- `security-audit.md` – Structured security checklist for code changes
- `security-review.md` – Broader vulnerability and risk assessment workflow
- `accessibility-audit.md` – Review for WCAG compliance issues
- `database-migration.md` – Plan, create, and validate database migrations with rollbacks
- `fix-git-issues.md` – Resolve merge conflicts and repository problems safely

### Git workflow

- `git-commit.md` – Create well-structured commit messages with optional issue key linking
- `git-push.md` – Push changes to remote with pre-push checks

## Claude Code skills

Slash commands for [Claude Code](https://code.claude.com), in `claude-code/skills/`. Copy a skill's folder into `~/.claude/skills/` to install it.

- [`/t3`](claude-code/skills/t3/) – Open the current Claude Code chat in the [T3 Code](https://github.com/pingdotgg/t3code) desktop app, importing it first if needed

## Quick start

1. Clone this repository or copy the `.cursor/commands/` directory into your project
2. Open the project in Cursor IDE
3. Type `/` in the AI chat to browse available commands
4. Select a command and let Cursor execute the prompt with your code context

## Installation options

```bash
# Option 1: clone the repository
git clone https://github.com/hamzafer/cursor-commands.git
cd cursor-commands
```

```bash
# Option 2: copy commands into an existing project
cp -r cursor-commands/.cursor /path/to/your/project/
```

Alternatively, create the directory manually:

1. Create `.cursor/commands/` in your project root
2. Copy or author the Markdown command files you need

## Writing your own commands

Use the existing files as templates or start from scratch:

```bash
touch .cursor/commands/my-custom-command.md
```

```markdown
# My Custom Command

Brief description of what this command does.

## Objective
Detailed explanation of the task and expected outcome.

## Requirements
- Specific requirements or constraints
- Coding standards to follow
- Expected formats or structures

## Output
Description of what the AI should produce.

Provide clear instructions for the AI to follow.
```

## Example prompts

```markdown
# Generate API Documentation

Create comprehensive API documentation for the current code. Include:

- Endpoint descriptions and HTTP methods
- Request/response schemas with examples
- Authentication requirements
- Error codes and responses
- Rate limiting information

Format as OpenAPI/Swagger specification.
```

```markdown
# Security Audit

Perform a security audit of the current code. Check for:

- SQL injection vulnerabilities
- XSS attack vectors
- Authentication and authorization issues
- Input validation problems
- Sensitive data exposure

Provide specific remediation steps for each issue found.
```

## Best practices

- **Be specific**: Describe the expected outcome and acceptance criteria
- **Provide context**: Reference project conventions, architecture, or standards
- **Set boundaries**: Clarify scope, assumptions, and tooling limits
- **Include examples**: Show expected formats or responses when helpful
- **Stay focused**: Keep each command targeted to a single, clear objective
- **Review together**: Treat command changes like code changes and review in PRs
- **Use descriptive names**: Make filenames reflect the command's purpose

## References

- [Changelog – v1.6](https://cursor.com/changelog)
- [Docs – Custom Slash Commands](https://cursor.com/docs/agent/chat/commands)
- [Announcement Post 1](https://x.com/cursor_ai/status/1967990959645528195)
- [Announcement Post 2](https://x.com/cursor_ai/status/1970185277923615188)

## Support

- Open an [issue](https://github.com/hamzafer/cursor-commands/issues) for feedback or requests
- Refer to this README for the command index that ships with the prompts

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=hamzafer/cursor-commands&type=Date)](https://star-history.com/#hamzafer/cursor-commands&Date)

## License

This project is open source and available under the [MIT License](LICENSE).
