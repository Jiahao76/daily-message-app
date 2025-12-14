# Lec 2 — API Gateway + Lambda: GET /today (Daily Message App)

Goal: Create a real HTTP endpoint so you can call GET /today and receive today’s message from DynamoDB.

Output of this lecture (Commit 3):
- API Gateway HTTP API created in us-east-1
- Lambda function GetTodayLambda created in us-east-1
- Route GET /today wired to Lambda
- Lambda reads from DynamoDB and returns JSON
- You can curl the endpoint and get today’s message

--------------------------------------------------
Pre-Flight Checklist (Do NOT Skip)
--------------------------------------------------

This lecture assumes Lec 1 is DONE.

Confirm these commands succeed BEFORE continuing:

1) AWS identity works:

    aws sts get-caller-identity

2) DynamoDB test works (from Lec 1):

    AWS_REGION=us-east-1 DDB_TABLE_NAME=DailyMessages npx ts-node services/scripts/test-dynamodb.ts

If either fails, stop and fix Lec 1 first.

--------------------------------------------------
What API Gateway Does (Conceptual)
--------------------------------------------------

API Gateway is the "front door" of your backend.

It:

- receives HTTP requests from the internet
- routes requests to backend integrations (here: Lambda)
- handles endpoint URL, methods, paths

We will use:

- HTTP API (not REST API)

HTTP API is:

- simpler
- cheaper
- faster to set up
- perfect for this project

--------------------------------------------------
What Lambda Does (Conceptual)
--------------------------------------------------

Lambda runs your code without you managing servers.

Key ideas:

- Handler function is invoked on demand
- AWS provides temporary credentials via an IAM Role
- You configure environment variables (region, table name)
- You control timeout and memory

In this lecture:

- Lambda will read DynamoDB
- Lambda will return JSON response

IMPORTANT:

- Locally you used Access Keys (aws configure)
- In AWS, Lambda should use an IAM Role (no access keys)

--------------------------------------------------
Endpoint Contract (Final)
--------------------------------------------------

Method: GET

Path: /today

Response: JSON

Example response:

```json
{
  "date": "2025-12-14",
  "text": "Your message for today..."
}
```

If no message exists for today:

```json
{
  "date": "2025-12-14",
  "text": null,
  "error": "MESSAGE_NOT_FOUND"
}
```

--------------------------------------------------
Step 1 — Create GetToday Lambda (AWS Console)
--------------------------------------------------

Region MUST be us-east-1.

1) AWS Console → Lambda

2) Create function

3) Author from scratch

Settings:

- Function name: GetTodayLambda
- Runtime: Node.js 20.x (or latest available)
- Architecture: x86_64

Permissions:

- Create a new role with basic Lambda permissions (default)

Click Create function.

--------------------------------------------------
Step 2 — Configure Lambda Environment Variables
--------------------------------------------------

In the Lambda function page:
Configuration → Environment variables → Edit

Add:

	DDB_TABLE_NAME = DailyMessages

Save.

Why:

- Same code can run in any environment
- No hardcoding
- Clear configuration

--------------------------------------------------
Step 3 — Attach DynamoDB Permissions to Lambda Role
--------------------------------------------------

Lambda must be allowed to read DynamoDB.

1) In Lambda page, go to Configuration → Permissions

2) Click the Role name to open IAM role

3) Add permissions → Attach policies

For this lecture, attach AWS-managed policy:

    AmazonDynamoDBReadOnlyAccess

This is good enough for GET /today.

Later, for bulk write, we will add write permissions.

--------------------------------------------------
Step 4 — Update Code: GetToday Lambda Handler
--------------------------------------------------

We will reuse your existing repository code and add an API handler.

Create file:

    services/handlers/getTodayApi.ts

Content:

```typescript
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
```

NOTE:

- We use JST date because you are in Japan and your "daily message" is tied to JST.
- This is a product decision. It must be explicit.

--------------------------------------------------
Step 5 — Local Test GetToday API Handler (Before Deploy)
--------------------------------------------------

Create file:

    services/scripts/test-get-today.ts

Content:

```typescript
import { handler } from "../handlers/getTodayApi";

async function main() {
  const res = await handler();
  console.log(res.statusCode);
  console.log(res.body);
}

main().catch(console.error);
```

Run:

    AWS_REGION=us-east-1 DDB_TABLE_NAME=DailyMessages npx ts-node services/scripts/test-get-today.ts

If it returns MESSAGE_NOT_FOUND, that is fine (means no item for today yet).

To create today’s message quickly, run:

    TODAY=$(python - << 'PY'
	import datetime
	from zoneinfo import ZoneInfo
	print(datetime.datetime.now(ZoneInfo("Asia/Tokyo")).date().isoformat())
	PY
	)
    AWS_REGION=us-east-1 DDB_TABLE_NAME=DailyMessages npx ts-node services/scripts/test-dynamodb.ts

If you do not want to use python, just manually insert today’s date into test script.

--------------------------------------------------
Step 6 — Deploy Lambda Code
--------------------------------------------------

We coopy-paste into Lambda console to avoid deployment tooling complexity.

Because Lambda console expects a single file, we will paste a simplified handler directly.


In Lambda console, go to:

Code → index.mjs (or index.js)

Replace content with the following logic (write in plain JS, no imports).

PASTE THIS (read carefully and paste exactly):

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" })
);

const TABLE_NAME = process.env.DDB_TABLE_NAME || "DailyMessages";

function getTodayJstDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const handler = async () => {
  const date = getTodayJstDate();

  const res = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: "MSG", SK: `DATE#${date}` },
    })
  );

  const item = res.Item;

  if (!item || item.status !== "ACTIVE") {
    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, text: null, error: "MESSAGE_NOT_FOUND" }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, text: item.text }),
  };
};
```

Why we do this in Lec 2:

- avoids introducing deployment tooling
- makes the endpoint work quickly
- we will clean this later when we introduce IaC (optional)

After pasting, click Deploy.

--------------------------------------------------
## Step 7 — Create API Gateway HTTP API (AWS Console)

**Important**
- Confirm the AWS Console region (top right) is **us-east-1**
- Confirm **GetTodayLambda** already exists

### Step 7.1 — Open API Gateway
1. Open **AWS Console**
2. In the search bar, type **API Gateway**
3. Click **API Gateway**

You should now be on the API Gateway home page.

### Step 7.2 — Start Creating a New API
1. Click **Create API**
2. You will see multiple API types
3. Under **HTTP API**, click **Build**

Do **NOT** choose REST API.

Set API name as `daily-message-api`. Choose IPv4.

### Step 7.3 — Configure Integration (Connect to Lambda)
You are now on the **Create an HTTP API** page.

1. In the **Integrations** section, click **Add integration**
2. Choose **Lambda**
3. For Lambda function, select **GetTodayLambda**
4. Click **Next**

Meaning: API Gateway will forward requests to this Lambda.

### Step 7.4 — Configure Route
You are now on the **Configure routes** page.

1. Click **Add route**
2. Set:
   - Method: **GET**
   - Resource path: **/today**
   - Integration target: **GetTodayLambda**
3. Click **Next**

This defines: GET /today

### Step 7.5 — Configure Stage
You are now on the **Configure stages** page.

1. Stage name: enter **prod**
2. Auto-deploy: leave **enabled** (default)
3. Click **Next**

Auto-deploy means changes go live automatically.

### Step 7.6 — Review and Create
You are now on the **Review and create** page.

Verify:

- API type: **HTTP API**
- Route: **GET /today**
- Integration: **GetTodayLambda**
- Stage: **prod**

Click **Create**.


--------------------------------------------------
Step 8 — Test the Endpoint
--------------------------------------------------

After creation, click the API on the left. You will see an **Invoke URL**, for example:

    https://abcd1234.execute-api.us-east-1.amazonaws.com/prod

Copy it.

Your full endpoint is:

    <INVOKE_URL>/today

Example:

    https://abcd1234.execute-api.us-east-1.amazonaws.com/prod/today

Test in the terminal:

    curl <INVOKE_URL>/today

If you see `MESSAGE_NOT_FOUND`, it means there is no item for today.
That is expected until you preload today’s message.

--------------------------------------------------
Step 9 — Insert Today’s Message (Quick Manual Insert)
--------------------------------------------------


- DynamoDB → Tables → DailyMessages → Explore table items
- Create item:
  - PK: MSG
  - SK: DATE#YYYY-MM-DD (today in JST)
  - text: "Hello group chat, this is today’s message."
  - status: ACTIVE
  - createdAt: any ISO string


Then test again:

    curl <INVOKE_URL>/today

--------------------------------------------------
Step 10 — Save This Lecture and Commit (Commit 3)
--------------------------------------------------

Save this file as:

    docs/lec-2-api-gateway-lambda-get-today.md

Commit:

    git add .
    git commit -m "L2: api gateway + lambda GET /today"
    git push origin main

NOTE:

- The Lambda console paste cannot be tracked in git.
- That is OK for Lec 2.
- In later lectures (or an optional IaC lecture), we will deploy from repo.

--------------------------------------------------
Definition of Done (Lec 2)
--------------------------------------------------

- GET /today endpoint exists
- curl returns today’s message
- No AccessDenied (Lambda role permission works)
- Everything is in us-east-1
- Commit 3 pushed

