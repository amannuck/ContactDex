import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url =
  process.env.WEBHOOK_URL ?? "http://127.0.0.1:8010/webhooks/connections";
const token =
  process.env.IMPORTER_WEBHOOK_TOKEN ?? "contactdex-aggr-webhook-token";

const payloadPath = path.join(__dirname, "demo-webhook-payload.json");
const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));

payload.idempotency_key =
  process.env.DEMO_IDEMPOTENCY_KEY ?? `hackathon-demo-${Date.now()}`;

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(payload),
});

const text = await res.text();
console.log(`${res.status} ${text}`);
if (!res.ok) {
  process.exit(1);
}
