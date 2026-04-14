export async function sendLineNotify(
  token: string,
  message: string
): Promise<"sent" | "cors" | "error"> {
  if (!token) return "error";
  try {
    const body = new URLSearchParams({ message });
    const res = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    return res.ok ? "sent" : "error";
  } catch (e) {
    // CORS errors throw a TypeError
    if (e instanceof TypeError) return "cors";
    return "error";
  }
}
