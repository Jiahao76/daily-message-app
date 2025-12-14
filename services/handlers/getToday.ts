export type ApiResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
};

export async function handler(): Promise<ApiResponse> {
  const todayJst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: todayJst,
      text: "Hello from Lec 0. Hardcoded message.",
    }),
  };
}