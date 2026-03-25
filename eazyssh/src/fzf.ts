import { execSync, spawn } from "child_process";
import type { SshHost } from "./config.js";
import { formatHostLabel } from "./config.js";

export function hasFzf(): boolean {
  try {
    execSync("which fzf", { stdio: "ignore" });
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

export async function connectSsh(host: SshHost): Promise<void> {
  const { spawn } = await import("child_process");

  const args: string[] = [];
  if (host.user) args.push(`${host.user}@${host.hostname || host.name}`);
  else args.push(host.hostname || host.name);
  if (host.port) args.push("-p", host.port);

  return new Promise((resolve, reject) => {
    const proc = spawn("ssh", args, {
      stdio: "inherit",
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ssh exited with code ${code}`));
    });

    proc.on("error", reject);
  });
}
