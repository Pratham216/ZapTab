import dns from "dns";
import mongoose from "mongoose";
import { config } from "./config";

/**
 * Force public DNS resolvers (Google / Cloudflare) for ALL lookups in this
 * process — not just the initial SRV query.  Without this, Windows may use a
 * network-adapter-specific resolver that can't reach *.mongodb.net shard
 * hostnames after the initial connection is established, causing
 * ENOTFOUND errors on every subsequent Atlas operation.
 */
function forcePublicDns(): void {
  try {
    // Prefer IPv4 so Atlas hostnames resolve to the right addresses.
    dns.setDefaultResultOrder("ipv4first");
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4", "1.0.0.1"]);
  } catch {
    // Non-fatal — connect will surface any remaining DNS errors.
  }
}

export async function connectDb(): Promise<void> {
  forcePublicDns();
  await mongoose.connect(config.mongoUri, {
    // Give Atlas up to 20 s to find a primary before failing fast.
    serverSelectionTimeoutMS: 20_000,
  });
  console.log("Connected to MongoDB");

  mongoose.connection.on("error", (err) => {
    console.error("[MongoDB] Connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] Disconnected — attempting to reconnect…");
  });
  mongoose.connection.on("reconnected", () => {
    console.log("[MongoDB] Reconnected");
  });
}
