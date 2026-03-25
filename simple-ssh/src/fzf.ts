import { execSync } from "child_process";
import { platform } from "os";
import type { SshHost } from "./config.js";
import { formatHostLabel } from "./config.js";

export function hasFzf(): boolean {
  try {
    const isWindows = platform() === "win32";
    const command = isWindows ? "where.exe fzf" : "which fzf";
    execSync(command, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export async function selectHostWithFzf(
  hosts: SshHost[]
): Promise<SshHost | null> {
  const { spawn } = await import("child_process");

  return new Promise((resolve) => {
    const options = [
      "--ansi",
      "--prompt=SSH> ",
      "--height=40%",
      "--reverse",
    ];

    const proc = spawn("fzf", options, {
      stdio: ["pipe", "pipe", "inherit"],
    });

    const input = hosts.map((h) => formatHostLabel(h)).join("\n");
    proc.stdin.write(input);
    proc.stdin.end();

    let output = "";
    proc.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    proc.on("close", (code: number) => {
      if (code !== 0 || !output.trim()) {
        resolve(null);
        return;
      }
      const selected = output.trim();
      const host = hosts.find((h) => formatHostLabel(h) === selected);
      resolve(host || null);
    });
  });
}

/**
 * Validate and sanitize a string for use as SSH hostname/user.
 * Only allows alphanumeric characters, dots, hyphens, and underscores.
 */
function validateSshParam(value: string, paramName: string): string {
  // SSH hostnames and usernames should only contain these characters
  const validPattern = /^[a-zA-Z0-9.\-_@]+$/;
  if (!validPattern.test(value)) {
    throw new Error(`Invalid ${paramName}: contains disallowed characters`);
  }
  return value;
}

export async function connectSsh(host: SshHost): Promise<void> {
  const { spawn } = await import("child_process");

  const args: string[] = [];

  const hostname = validateSshParam(host.hostname || host.name, "hostname");
  const target = host.user
    ? `${validateSshParam(host.user, "user")}@${hostname}`
    : hostname;

  args.push(target);

  if (host.port) {
    // Validate port number
    const port = parseInt(host.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port number: ${host.port}`);
    }
    args.push("-p", host.port);
  }

  return new Promise((resolve, reject) => {
    const proc = spawn("ssh", args, {
      stdio: "inherit",
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else if (code === null) reject(new Error("ssh process was killed by signal"));
      else reject(new Error(`ssh exited with code ${code}`));
    });

    proc.on("error", reject);
  });
}
