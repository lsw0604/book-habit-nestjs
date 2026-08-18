---
name: commit
description: Create a git commit following project conventions
disable-model-invocation: true
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git commit:*), Bash(git log:*), Bash(git branch:*)
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits (for style reference only, do not copy content): !`git log --oneline --decorate -20`

## Your task

Analyze the changes in the working directory and create appropriate git commits.

**Important:**

1. Review all changed files (both staged and unstaged).
2. If there are no changes at all (working tree clean, nothing staged or unstaged), tell the user there is nothing to commit and stop — do not create an empty commit.
3. Group related changes into logical units. If there are multiple unrelated changes, split them into separate commits; never mix unrelated changes in the same commit.
4. For each logical group: `git add` only the files belonging to that group, then commit using only what's staged at that point. Do not commit files that haven't been explicitly staged for the current group.
5. If all changes are simple and clearly related, a single commit is fine.
6. Commit short summary and body must be written in Korean. The scope must be in English (package name or directory name).
7. Do not add a Co-Authored-By or any Claude attribution line to the commit.
8. Body is optional: omit it when the short summary is self-explanatory; include it when the change needs context (why, not just what) that isn't obvious from the diff or the summary alone.

**Steps:**  

1. Analyze `git status` and `git diff` to understand all changes.
2. Identify logical groups of related changes.
3. For each group, in order:
   - `git add` the files for that group.
   - Write a commit message following the format and emoji legend below.
   - Run `git commit`.
4. After all commits are created, show the user a short list of the commits made (`git log --oneline -n <count>`).

**Commit message format:**

```
(<scope>): <emoji type> <short summary>
<BLANK LINE>
<body (optional)>
```

Example:

```
(auth): 🐛 로그인 시 토큰 만료 처리 오류 수정

리프레시 토큰 갱신 로직에서 만료 시간 비교가 잘못되어 있어
정상 토큰도 만료로 처리되던 문제를 수정함
```

**Emoji type legend** — pick the single best match:

- ✨ : add/fix feature
- ✏️ : comments or typo fix
- ♻️ : refactor
- 🎨 : add/change UI layout or CSS
- 🍱 : add/change static files
- 💬 : apply code review
- 📝 : documentation
- 🚀 : release commit
- 📦 : npm package update (package.json)
- ⚡️ : improve performance
- 🐛 : fix bug
- 💅 : fix lint, prettier error
- 🔥 : hot fix
- 🧹 : remove unnecessary code or files
- 👷 : add/change ci/cd workflow
- ⚙️ : add/change project config file (eslintrc, prettierrc etc.)
- 🦋 : commit changeset file
- 🚧 : work in progress, but commit for split large scale jobs
- 🔁 : fix rebase conflict issue