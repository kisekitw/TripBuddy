import { handleMessage } from "./handlers.ts";

/** Verify LINE signature: HMAC-SHA256(body, channelSecret) === x-line-signature */
async function verifySignature(body: string, signature: string): Promise<boolean> {
  const secret = Deno.env.get("LINE_CHANNEL_SECRET")!;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return expected === signature;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const sig = req.headers.get("x-line-signature") ?? "";
  const body = await req.text();

  if (!(await verifySignature(body, sig))) {
    return new Response("Forbidden", { status: 403 });
  }

  const { events } = JSON.parse(body) as { events: unknown[] };
  for (const event of events) {
    const ev = event as {
      type: string;
      replyToken: string;
      source: { userId: string };
      message: { type: string; text?: string };
    };
    if (ev.type === "message") {
      await handleMessage(ev);
    }
  }

  return new Response("OK");
});
