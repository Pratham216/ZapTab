import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileEnvPath = path.resolve(__dirname, "../mobile/.env");
const backendPort = process.env.PORT ?? "3001";
const useLocal = process.argv.includes("--local");

if (!useLocal) {
  console.log(
    "Skipping LAN sync. Mobile uses EXPO_PUBLIC_API_URL from mobile/.env (production by default)."
  );
  console.log("For local backend testing, run: pnpm dev:mobile:local");
  process.exit(0);
}

const VIRTUAL_IFACE =
  /vethernet|virtual|wsl|hyper-v|docker|vmware|virtualbox|loopback|bluetooth|vpn|tap|tun|npcap|pseudo|tailscale|zerotier/i;

function scoreCandidate(ifaceName, ip) {
  const name = ifaceName.toLowerCase();
  let score = 0;

  if (/wi-?fi|wlan|wireless/.test(name)) score += 100;
  if (/^ethernet/.test(name) && !VIRTUAL_IFACE.test(name)) score += 90;
  if (VIRTUAL_IFACE.test(name)) score -= 1000;
  if (ip.startsWith("192.168.")) score += 80;
  if (ip.startsWith("10.96.") && VIRTUAL_IFACE.test(name)) score -= 500;
  if (ip.startsWith("10.")) score += 40;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) score += 30;
  if (ip.startsWith("169.254.")) score -= 1000;

  return score;
}

function getLocalLanIp() {
  const candidates = [];

  for (const [iface, addrs] of Object.entries(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      candidates.push({
        iface,
        ip: addr.address,
        score: scoreCandidate(iface, addr.address),
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates.find((c) => c.score > 0);
  return best?.ip ?? candidates[0]?.ip ?? null;
}

const lanIp = getLocalLanIp();
if (!lanIp) {
  console.warn("Could not detect LAN IP for mobile/.env");
  process.exit(0);
}

const apiUrl = `http://${lanIp}:${backendPort}`;
const envLine = `EXPO_PUBLIC_API_URL=${apiUrl}`;
let existing = "";

if (fs.existsSync(mobileEnvPath)) {
  existing = fs.readFileSync(mobileEnvPath, "utf8");
}

if (existing.includes("EXPO_PUBLIC_API_URL=")) {
  const next = existing.replace(
    /^EXPO_PUBLIC_API_URL=.*$/m,
    envLine
  );
  if (next !== existing) {
    fs.writeFileSync(mobileEnvPath, next.endsWith("\n") ? next : `${next}\n`);
    console.log(`Updated mobile/.env → ${apiUrl}`);
  } else {
    console.log(`Mobile API URL already set → ${apiUrl}`);
  }
} else {
  const prefix = existing.trim() ? `${existing.trim()}\n` : "";
  fs.writeFileSync(mobileEnvPath, `${prefix}${envLine}\n`);
  console.log(`Wrote mobile/.env → ${apiUrl}`);
}
