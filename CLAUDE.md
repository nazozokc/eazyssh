# simple-ssh

## Recent Changes

- `fix: correct removeHostFromConfig partial match bug` - Fixed bug where removing one host from multi-host line (e.g., `Host foo bar`) incorrectly removed all config for remaining hosts
- `feat: implement default action for no arguments` - Running `eazyssh` without arguments now launches fzf for host selection (same as `connect` command)
- `fix: update directory names in flake.nix and dependabot.yml` - Changed `eazyssh` to `simple-ssh` for consistency
