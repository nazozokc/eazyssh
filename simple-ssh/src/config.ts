import { readFile, writeFile, rename } from "fs/promises";
import { homedir } from "os";
import path from "path";
import { randomBytes } from "crypto";

export interface SshHost {
  name: string;
  hostname?: string;
  user?: string;
  port?: string;
  identityFile?: string;
  extras: Record<string, string>;
}

const SSH_CONFIG_PATH = process.env.SSH_CONFIG || path.join(homedir(), ".ssh", "config");

export async function readSshConfig(): Promise<SshHost[]> {
  try {
    const content = await readFile(SSH_CONFIG_PATH, "utf-8");
    return parseSshConfig(content);
  } catch {
    return [];
  }
}

export function parseSshConfig(content: string): SshHost[] {
  const hosts: SshHost[] = [];
  const lines = content.split("\n");
  let currentHost: SshHost | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const hostMatch = trimmed.match(/^Host\s+(.+)$/i);
    if (hostMatch) {
      // Support multiple hosts in single Host directive (space-separated)
      const hostNames = hostMatch[1].trim().split(/\s+/);
      for (const name of hostNames) {
        // Skip wildcard hosts
        if (name === "*" || name.includes("*") || name.includes("?")) continue;
        if (currentHost) hosts.push(currentHost);
        currentHost = { name, extras: {} };
      }
      continue;
    }

    if (currentHost) {
      const keyMatch = trimmed.match(/^(\w+)\s+(.+)$/);
      if (keyMatch) {
        const [, key, value] = keyMatch;
        const lowerKey = key.toLowerCase();
        switch (lowerKey) {
          case "hostname":
            currentHost.hostname = value.trim();
            break;
          case "user":
            currentHost.user = value.trim();
            break;
          case "port":
            currentHost.port = value.trim();
            break;
          case "identityfile":
            currentHost.identityFile = value.trim();
            break;
          default:
            currentHost.extras[lowerKey] = value.trim();
        }
      }
    }
  }

  if (currentHost) hosts.push(currentHost);
  return hosts;
}

/**
 * Atomically append a host to the SSH config file using a temp file.
 */
export async function appendHostToConfig(host: SshHost): Promise<void> {
  const lines = [
    "",
    `Host ${host.name}`,
  ];
  if (host.hostname) lines.push(`    HostName ${host.hostname}`);
  if (host.user) lines.push(`    User ${host.user}`);
  if (host.port) lines.push(`    Port ${host.port}`);
  if (host.identityFile) lines.push(`    IdentityFile ${host.identityFile}`);
  for (const [key, value] of Object.entries(host.extras)) {
    lines.push(`    ${key} ${value}`);
  }

  // Read existing content first, then write atomically
  try {
    const existingContent = await readFile(SSH_CONFIG_PATH, "utf-8");
    const newContent = existingContent + lines.join("\n") + "\n";
    await writeAtomically(SSH_CONFIG_PATH, newContent);
  } catch {
    // File doesn't exist, create new
    await writeAtomically(SSH_CONFIG_PATH, lines.join("\n") + "\n");
  }
}

/**
 * Write content to a file atomically using a temp file and rename.
 */
async function writeAtomically(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  const tempFileName = `.ssh_config_tmp_${randomBytes(8).toString("hex")}`;
  const tempPath = path.join(dir, tempFileName);

  try {
    await writeFile(tempPath, content, "utf-8");
    await rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file on error
    try {
      await writeFile(tempPath, "", "utf-8");
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Remove a host from the SSH config file atomically.
 * Handles multiple hosts in a single Host directive and wildcard patterns.
 */
export async function removeHostFromConfig(name: string): Promise<boolean> {
  const content = await readFile(SSH_CONFIG_PATH, "utf-8");
  const lines = content.split("\n");
  const result: string[] = [];
  let insideTarget = false;
  let found = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const hostMatch = trimmed.match(/^Host\s+(.+)$/i);
    if (hostMatch) {
      // Handle multiple hosts in Host directive
      const hostNames = hostMatch[1].trim().split(/\s+/);
      const matchingHosts = hostNames.filter(h => h === name);

      if (matchingHosts.length > 0) {
        found = true;
        // If only one host matches, skip this Host line entirely
        if (matchingHosts.length === hostNames.length) {
          // All hosts in this directive match, skip the entire line
          insideTarget = true;
          continue;
        } else {
          // Partial match - rewrite Host line with remaining hosts
          const remainingHosts = hostNames.filter(h => h !== name).join(" ");
          result.push(`Host ${remainingHosts}`);
          continue;
        }
      } else {
        insideTarget = false;
      }
    } else if (insideTarget && trimmed === "") {
      insideTarget = false;
      continue;
    }

    if (!insideTarget) {
      result.push(line);
    }
  }

  await writeAtomically(SSH_CONFIG_PATH, result.join("\n") + "\n");
  return found;
}

export function formatHostLabel(host: SshHost): string {
  const name = host.name.padEnd(20);
  const userHost = host.user
    ? `${host.user}@${host.hostname || host.name}`
    : (host.hostname || host.name);
  const port = host.port ? `:${host.port}` : "";
  return `${name} ${userHost}${port}`;
}
