import { putDailyMessage, getDailyMessage } from "../repositories/messageRepo";

async function main() {
  const date = "2025-01-01";

  await putDailyMessage(date, "Happy New Year!");
  const msg = await getDailyMessage(date);

  console.log("Message:", msg);
}

main().catch(console.error);