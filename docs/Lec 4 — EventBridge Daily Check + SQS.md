# Lec 4 — EventBridge Daily Check + SQS (Daily Message App)

Goal: Add a **daily automatic check** that verifies whether today’s message exists, and **fails loudly** (via logs + queue) if it does not.

This lecture introduces **event-driven architecture** and makes your system production-shaped.

Output of this lecture (Commit 5):

- EventBridge scheduled rule (daily)
- SQS queue for alerts / async jobs
- Lambda that checks today’s message
- Lambda that consumes SQS messages
- System detects missing daily message automatically

--------------------------------------------------
Why Lec 4 Exists (Conceptual)
--------------------------------------------------

So far, your system works **only when you remember** to preload messages.

This is dangerous.

In real systems:

- Silence is the worst failure mode
- Missing data should be detected automatically
- Background checks should NOT block APIs

So we add:

- EventBridge → time-based trigger
- SQS → reliable async notification channel

This makes your app:

- safer
- more professional
- closer to real production systems

--------------------------------------------------
What EventBridge Does (Conceptual)
--------------------------------------------------

EventBridge is:

- AWS’s event bus and scheduler
- Able to trigger actions based on time or events

We use it as:

- A **daily cron job**
- That runs even if no one calls the API

Think:
> “Every day at 00:05 JST, check if today’s message exists.”

--------------------------------------------------
What SQS Does (Conceptual)
--------------------------------------------------

SQS is:

- A durable message queue
- Decouples producers from consumers
- Retries automatically if consumers fail

We use it to:

- record missing-message alerts
- avoid blocking EventBridge
- allow future extensions (email, Slack, LINE)

--------------------------------------------------
Architecture After Lec 4
--------------------------------------------------

Daily schedule:

EventBridge
  → DailyCheckLambda
      → DynamoDB (check today)
      → SQS (if missing)

Async processing:

SQS
  → AlertWorkerLambda
      → logs / audit / future notifications

--------------------------------------------------
Phase A — Create SQS Queue
--------------------------------------------------

--------------------------------------------------
Step A1 — Create SQS Queue (AWS Console)
--------------------------------------------------

1) AWS Console → SQS

2) Create queue

Settings:

- Type: Standard
- Name: daily-message-alert-queue

All other settings:

- Leave defaults

Create queue.

After creation:

- Copy the **Queue URL**
- You will need it soon

--------------------------------------------------
Phase B — Create Daily Check Lambda
--------------------------------------------------

--------------------------------------------------
Step B1 — Create Lambda Function
--------------------------------------------------

AWS Console → Lambda → Create function

Settings:

- Function name: DailyCheckLambda
- Runtime: Node.js 20.x
- Architecture: x86_64
- Role: Create a new role with basic Lambda permissions

Create function.

--------------------------------------------------
Step B2 — Configure Environment Variables
--------------------------------------------------

In DailyCheckLambda → Configuration → Environment variables:

Add:

- `DDB_TABLE_NAME` = `DailyMessages`
- `ALERT_QUEUE_URL` = `<SQS Queue URL>`


--------------------------------------------------
Step B3 — Attach Permissions to Lambda Role
--------------------------------------------------

DailyCheckLambda needs:

- Read from DynamoDB
- Send messages to SQS

Attach these AWS-managed policies to its role:

- AmazonDynamoDBReadOnlyAccess
- AmazonSQSFullAccess

(We will tighten permissions later.)

--------------------------------------------------
Step B4 — Daily Check Lambda Code
--------------------------------------------------

In Lambda console, replace code and Deploy.

Paste exactly:

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand
} from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION })
);

const sqs = new SQSClient({ region: process.env.AWS_REGION });

const TABLE_NAME = process.env.DDB_TABLE_NAME;
const QUEUE_URL = process.env.ALERT_QUEUE_URL;

function getTodayJstDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const y = parts.find(p => p.type === "year").value;
  const m = parts.find(p => p.type === "month").value;
  const d = parts.find(p => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

export const handler = async () => {
  const date = getTodayJstDate();

  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: "MSG", SK: `DATE#${date}` }
    })
  );

  if (!res.Item || res.Item.status !== "ACTIVE") {
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify({
          type: "MISSING_DAILY_MESSAGE",
          date
        })
      })
    );

    console.error("Daily message missing for", date);
  }

  return { ok: true };
};
```
--------------------------------------------------
Phase C — Create EventBridge Scheduled Rule
--------------------------------------------------

--------------------------------------------------
Step C1 — Create Schedule
--------------------------------------------------

AWS Console → EventBridge Scheduler → Create schedule

Settings:

- Name: daily-message-check
- Schedule pattern: Cron-based
- Cron expression:

    5 15 * * ? *
- Flexible time window: Off    

Explanation:

- 15 UTC = 00 JST
- 5 minutes after midnight JST

--------------------------------------------------
Step C2 — Configure Target
--------------------------------------------------

Target type:

- AWS service
- Lambda
- Function: DailyCheckLambda

Permissions:
- Create new role (default)

Create schedule.

--------------------------------------------------
Phase D — Create SQS Worker Lambda
--------------------------------------------------

--------------------------------------------------
Step D1 — Create Worker Lambda
--------------------------------------------------

AWS Console → Lambda → Create function

Settings:

- Function name: AlertWorkerLambda
- Runtime: Node.js 20.x
- Architecture: x86_64
- Role: Create a new role with basic Lambda permissions

Then in configuration - permission, attach to your role the following policy:

- AmazonSQSFullAccess

--------------------------------------------------
Step D2 — Configure SQS Trigger
--------------------------------------------------

In AlertWorkerLambda:

- Add trigger
- Source: SQS
- Queue: daily-message-alert-queue
- Batch size: 1

Enable trigger.

--------------------------------------------------
Step D3 — Worker Lambda Code
--------------------------------------------------

Replace code and Deploy.

Paste:

```javascript
export const handler = async (event) => {
  for (const record of event.Records) {
    const msg = JSON.parse(record.body);
    console.error("ALERT:", msg);
  }
};
```

This worker:

- logs missing message alerts
- can later be extended to send email / Slack / LINE

--------------------------------------------------
Why This Design Is Correct
--------------------------------------------------

- API is NOT blocked by background checks
- Failures are detected automatically
- System is extensible
- Costs are negligible

This is how real production systems are built.

--------------------------------------------------
Step E — Save Lecture and Commit (Commit 5)
--------------------------------------------------

Save as:

    docs/lec-4-eventbridge-sqs.md

Commit:

    git add .
    git commit -m "L4: daily check with eventbridge and sqs"
    git push origin main

--------------------------------------------------
Definition of Done (Lec 4)
--------------------------------------------------

- EventBridge schedule exists
- DailyCheckLambda runs
- Missing message triggers SQS message
- AlertWorkerLambda processes queue
- Commit 5 pushed

--------------------------------------------------
Preview of Lec 5
--------------------------------------------------

Next lecture:
- Ack endpoint
- Idempotency
- Safety and cost guards

 