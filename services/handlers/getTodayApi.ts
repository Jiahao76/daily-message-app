import { getDailyMessage } from "../repositories/messageRepo";

function getTodayJstDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function handler() {
  const date = getTodayJstDate();
  const text = await getDailyMessage(date);

  if (!text) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        text: null,
        error: "MESSAGE_NOT_FOUND",
      }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date,
      text,
    }),
  };
}