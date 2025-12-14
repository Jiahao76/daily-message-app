import { handler } from "../handlers/getTodayApi";

async function main() {
  const res = await handler();
  console.log(res.statusCode);
  console.log(res.body);
}

main().catch(console.error);