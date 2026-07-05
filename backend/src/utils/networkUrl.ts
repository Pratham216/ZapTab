import os from "os";
import { config } from "../config";

const VIRTUAL_IFACE =
  /vethernet|virtual|wsl|hyper-v|docker|vmware|virtualbox|loopback|bluetooth|vpn|tap|tun|npcap|pseudo|tailscale|zerotier/i;

function scoreCandidate(ifaceName: string, ip: string): number {
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

export function getLocalLanCandidates(): Array<{
  iface: string;
  ip: string;
  score: number;
}> {
  const candidates: Array<{ iface: string; ip: string; score: number }> = [];

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

  return candidates.sort((a, b) => b.score - a.score);
}

/** Pick the machine's LAN IPv4 for phone-friendly invite links */
export function getLocalLanIp(): string | null {
  const candidates = getLocalLanCandidates();
  const best = candidates.find((c) => c.score > 0);
  return best?.ip ?? candidates[0]?.ip ?? null;
}

/** Base URL for invite links / QR — LAN IP in dev, APP_URL in production */
export function getAppBaseUrl(): string {
  if (config.lanIp) {
    return `http://${config.lanIp}:${config.frontendPort}`;
  }

  const configured = config.appUrl.replace(/\/$/, "");

  if (
    configured &&
    !configured.includes("localhost") &&
    !configured.includes("127.0.0.1")
  ) {
    return configured;
  }

  const ip = getLocalLanIp();
  if (ip) {
    return `http://${ip}:${config.frontendPort}`;
  }

  return configured || `http://localhost:${config.frontendPort}`;
}

export function getJoinUrl(code: string): string {
  return `${getAppBaseUrl()}/join/${code}`;
}

export function logNetworkInfo(): void {
  const candidates = getLocalLanCandidates();
  console.log("Network interfaces for invite links:");
  for (const c of candidates.slice(0, 5)) {
    console.log(`  [${c.score}] ${c.iface} → ${c.ip}`);
  }
  console.log(`Invite links use: ${getAppBaseUrl()}`);
  const ip = getLocalLanIp();
  if (ip) {
    console.log(`Mobile API URL: http://${ip}:${config.port}`);
  }
}
