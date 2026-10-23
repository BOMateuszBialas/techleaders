#!/usr/bin/env bash
# PreToolUse guardrail for the Bash, PowerShell and Monitor tools (wired in .claude/settings.json).
# Adapted from the lesson 09 lab (07-hook). Spec: .ai/specs/implemented/2026-10-23-agent-workshop-hardening.md
#
# Claude Code passes the tool call as JSON on stdin; the command is in .tool_input.command for all
# three tools. The exit code decides:
#   0     the call goes on to the normal permission flow,
#   2     the call is BLOCKED and stderr is shown to the model,
#   other a hook error: the call GOES THROUGH. So every failure below exits 2 (fail closed).
#
# This is a tripwire, not a sandbox: it matches the command text. Known bypasses are listed in
# .ai/security-notes.md. Test it without an agent: bash .claude/hooks/test-pre-tool-use.sh

block() {
  echo "Blocked by the team policy (.claude/hooks/pre-tool-use.sh): $1. Do not try to get around this block with another command; ask the user instead." >&2
  exit 2
}

input=$(cat)

# Parse with jq when it is installed, otherwise with node (always present in this repo).
# HOOK_JSON_PARSER=node forces the fallback (used by the tests to cover both parsers).
if [ "${HOOK_JSON_PARSER:-}" != "node" ] && command -v jq >/dev/null 2>&1; then
  cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null) || block "the hook could not parse its input"
elif command -v node >/dev/null 2>&1; then
  cmd=$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const c=JSON.parse(s)?.tool_input?.command;process.stdout.write(typeof c==="string"?c:"")})' 2>/dev/null) || block "the hook could not parse its input"
else
  block "the hook needs jq or node to read the tool call"
fi

[ -z "$cmd" ] && exit 0

# Windows file systems and PowerShell are case-insensitive (.ENV opens .env), so match in lower case.
lc=${cmd,,}

# Shared building blocks (POSIX ERE, used with [[ =~ ]]).
sep='(^|[[:space:];&|(`{"'"'"'])'          # start of a command word
home='(~|\$home|\$\{home\}|\$env:userprofile|\$env:home|%userprofile%|/c/users/[^/[:space:]]+|[a-z]:[\\/]+users[\\/]+[^\\/[:space:]]+)'

# 1. Remote content piped or substituted straight into an interpreter.
fetch='(curl|wget|iwr|irm|invoke-webrequest|invoke-restmethod|downloadstring|net\.webclient|start-bitstransfer)'
runner='(sh|bash|zsh|dash|ksh|pwsh|powershell|iex|invoke-expression|node|python[0-9.]*|perl|ruby)'
if [[ $lc =~ $fetch[^\;\&]*\|[[:space:]]*(sudo[[:space:]]+)?(env[[:space:]]+)?$runner([[:space:]]|\)|$) ]] ||
  [[ $lc =~ (sh|bash|zsh)[[:space:]]+(-[a-z]+[[:space:]]+)*[\"\']?(\<\(|\$\()[[:space:]]*$fetch ]] ||
  [[ $lc =~ (iex|invoke-expression)[^\;\|]*$fetch ]]; then
  block "piping a downloaded script into a shell or interpreter"
fi

# 2. Recursive deletion: nothing recursive is allowed (decision of the spec).
if [[ $lc =~ ${sep}(sudo[[:space:]]+)?([^[:space:]\;\&\|]*[/\\])?rm(\.exe)?[[:space:]]([^\;\&\|]*[[:space:]])?-(-recursive|[a-z]*r) ]] ||
  [[ $lc =~ ${sep}(remove-item|ri|del|erase|rd|rmdir)[[:space:]]([^\;\|]*[[:space:]])?-r ]] ||
  [[ $lc =~ ${sep}(rd|rmdir)[[:space:]]+([^\;\&\|]*[[:space:]])?/s ]] ||
  [[ $lc =~ -recurse[^\;]*\|[[:space:]]*(remove-item|ri|rm|del|erase) ]] ||
  [[ $lc =~ ${sep}find[[:space:]][^\;\&\|]*(-delete|-exec(dir)?[[:space:]]+(rm|rmdir)) ]] ||
  [[ $lc =~ directory\]::delete\( ]] ||
  [[ $lc =~ ${sep}(npx[[:space:]]+)?rimraf[[:space:]] ]]; then
  block "recursive deletion (rm -r, Remove-Item -Recurse, find -delete and similar)"
fi

# 3. Credential stores in the home directory, and printing the GitHub CLI token.
if [[ $lc =~ $home[\\/]+\.(ssh|aws|config[\\/]+gh)([\\/[:space:]\"\']|$) ]] ||
  [[ $lc =~ ${sep}gh[[:space:]]+auth[[:space:]]+token ]]; then
  block "access to SSH keys, cloud or GitHub credentials"
fi

# 4. Any .env file except the committed placeholders .env.example and .env.template.
#    "process.env" and "$env:X" are not files and do not match (the name must start a path segment).
rest=${lc//.env.example/}
rest=${rest//.env.template/}
# Loading the root .env into a process with --env-file is how worktrees get their settings
# (AGENTS.md); allowed only when the same command cannot print the environment.
if ! [[ $rest =~ (process\.env|printenv|console\.|--eval|--print|(^|[[:space:]])-(e|p|pe)[[:space:]]|echo|write-(host|output)) ]]; then
  rest=$(printf '%s' "$rest" | sed -E 's/--env-file(=|[[:space:]]+)[^[:space:]]+//g')
fi
if [[ $rest =~ (^|[^[:alnum:]_])\.env([^[:alnum:]]|$) ]] ||
  [[ $rest =~ (^|[[:space:]/\\\"\'=])\.[e?*\[][^[:space:]/\\]*[*?\[] ]]; then
  block "reading or writing a .env file (only .env.example and .env.template are allowed)"
fi

exit 0
