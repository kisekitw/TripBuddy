const LINE_API = "https://api.line.me/v2/bot/message/reply";

export async function replyMessage(replyToken: string, text: string): Promise<void> {
  const token = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!;
  const res = await fetch(LINE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
  if (!res.ok) {
    console.error(`LINE API error ${res.status}:`, await res.text());
  }
}
