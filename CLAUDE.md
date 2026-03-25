## Recent Changes

- fix: parse multi-host config entries correctly
- fix: validate host name in add command
- fix: handle missing SSH config file in removeHostFromConfig
- fix: use unlink for temp file cleanup in writeAtomically
- fix: remove redundant try/catch in connectSsh
=======
# simple-ssh

## Recent Changes

- `fix: correct removeHostFromConfig partial match bug` - Fixed bug where removing one host from multi-host line (e.g., `Host foo bar`) incorrectly removed all config for remaining hosts
- `feat: implement default action for no arguments` - Running `eazyssh` without arguments now launches fzf for host selection (same as `connect` command)
- `fix: update directory names in flake.nix and dependabot.yml` - Changed `eazyssh` to `simple-ssh` for consistency