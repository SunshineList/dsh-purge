// 自动定位本机 DSH 宿主的 @deepseek-ai 根目录。
// 优先 PURGE_HOST，其次常见安装位置；找不到返回 null，由测试自行 skip。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

function isHost(dir) {
  return Boolean(dir)
    && fs.existsSync(path.join(dir, "dsh-system-prompt", "lib", "index.js"));
}

function fromEnv() {
  return process.env.PURGE_HOST || "";
}

function fromDshHome() {
  const home = process.env.DSH_HOME || path.join(os.homedir(), ".dsh");
  const candidates = [
    path.join(home, "profiles", "web", "node_modules", "@deepseek-ai"),
    path.join(home, "profiles", "desktop", "node_modules", "@deepseek-ai"),
    path.join(home, "node_modules", "@deepseek-ai"),
  ];
  return candidates.find(isHost) || "";
}

function fromNvmBun() {
  const home = os.homedir();
  const roots = [];
  try {
    const nvmDir = path.join(home, ".nvm", "versions", "node");
    if (fs.existsSync(nvmDir)) {
      for (const ver of fs.readdirSync(nvmDir)) {
        roots.push(path.join(nvmDir, ver, "lib", "node_modules"));
      }
    }
  } catch { /* ignore */ }
  try {
    const bunDir = path.join(home, ".bun", "install", "global", "node_modules");
    roots.push(bunDir);
  } catch { /* ignore */ }
  for (const root of roots) {
    const nested = path.join(root, "@deepseek-ai", "dsh", "node_modules", "@deepseek-ai");
    const flat = path.join(root, "@deepseek-ai");
    if (isHost(nested)) return nested;
    if (isHost(flat)) return flat;
  }
  return "";
}

function fromNpmPrefix() {
  try {
    const prefix = execFileSync("npm", ["prefix", "-g"], { encoding: "utf8" }).trim();
    const nested = path.join(prefix, "lib", "node_modules", "@deepseek-ai", "dsh", "node_modules", "@deepseek-ai");
    const flat = path.join(prefix, "lib", "node_modules", "@deepseek-ai");
    const win = path.join(prefix, "node_modules", "@deepseek-ai");
    for (const dir of [nested, flat, win]) {
      if (isHost(dir)) return dir;
    }
  } catch { /* ignore */ }
  return "";
}

/** @returns {string} 绝对路径，找不到时返回空串 */
export function findHost() {
  for (const fn of [fromEnv, fromDshHome, fromNvmBun, fromNpmPrefix]) {
    const hit = fn();
    if (isHost(hit)) return hit;
  }
  return "";
}

export default findHost;
