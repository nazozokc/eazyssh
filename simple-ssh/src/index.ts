#!/usr/bin/env node
import { Command } from "commander";
import {
  readSshConfig,
  appendHostToConfig,
  removeHostFromConfig,
  formatHostLabel,
  type SshHost,
} from "./config.js";
import { hasFzf, selectHostWithFzf, connectSsh } from "./fzf.js";

const program = new Command();

program
  .name("eazyssh")
  .description("A simple SSH host manager CLI")
  .version("0.1.0");

program
  .command("connect")
  .description("Select a host with fzf and SSH connect")
  .action(async () => {
    const hosts = await readSshConfig();
    if (hosts.length === 0) {
      console.error("No hosts found in ~/.ssh/config");
      process.exit(1);
    }

    if (!hasFzf()) {
      console.error("fzf not found. Install it: https://github.com/junegunn/fzf");
      process.exit(1);
    }

    const selected = await selectHostWithFzf(hosts);
    if (!selected) {
      process.exit(0);
    }

    await connectSsh(selected);
  });

program
  .command("list")
  .alias("ls")
  .description("List all SSH hosts")
  .action(async () => {
    const hosts = await readSshConfig();
    for (const host of hosts) {
      console.log(formatHostLabel(host));
    }
  });

/**
 * Validate port number string.
 * Returns true if valid port number (1-65535).
 */
function isValidPort(port: string): boolean {
  const num = parseInt(port, 10);
  return !isNaN(num) && num >= 1 && num <= 65535 && String(num) === port;
}

program
  .command("add <name>")
  .description("Add a new SSH host")
  .option("-H, --hostname <hostname>", "Hostname or IP address")
  .option("-u, --user <user>", "SSH username")
  .option("-p, --port <port>", "SSH port (1-65535)")
  .option("-i, --identity-file <path>", "Path to identity file")
  .action(async (name, options) => {
    if (!options.hostname) {
      console.error("Error: --hostname is required");
      process.exit(1);
    }

    // Validate port if provided
    if (options.port && !isValidPort(options.port)) {
      console.error("Error: --port must be a number between 1 and 65535");
      process.exit(1);
    }

    const host: SshHost = {
      name,
      hostname: options.hostname,
      user: options.user,
      port: options.port,
      identityFile: options.identityFile,
      extras: {},
    };
    await appendHostToConfig(host);
    console.log(`Host '${name}' added successfully.`);
  });

program
  .command("remove <name>")
  .alias("rm")
  .description("Remove an SSH host")
  .action(async (name) => {
    const removed = await removeHostFromConfig(name);
    if (removed) {
      console.log(`Host '${name}' removed successfully.`);
    } else {
      console.error(`Host '${name}' not found.`);
      process.exit(1);
    }
  });

program
  .command("show <name>")
  .description("Show details of an SSH host")
  .action(async (name) => {
    const hosts = await readSshConfig();
    const host = hosts.find((h) => h.name === name);
    if (!host) {
      console.error(`Host '${name}' not found.`);
      process.exit(1);
    }
    console.log(`Host: ${host.name}`);
    if (host.hostname) console.log(`  HostName: ${host.hostname}`);
    if (host.user) console.log(`  User: ${host.user}`);
    if (host.port) console.log(`  Port: ${host.port}`);
    if (host.identityFile) console.log(`  IdentityFile: ${host.identityFile}`);
    for (const [key, value] of Object.entries(host.extras)) {
      console.log(`  ${key}: ${value}`);
    }
  });

program.parse();
