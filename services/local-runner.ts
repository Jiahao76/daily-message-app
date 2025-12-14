import { handler } from "./handlers/getToday";

async function main() {
  const res = await handler();
  console.log("=== Local Lambda Output ===");
  console.log(res.statusCode);
  console.log(res.headers);
  console.log(res.body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});