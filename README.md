# NoQueueBilling

Scan-and-go retail app (Expo + React Native) with AWS Lambda backend and Razorpay.

## Run the app

```bash
cd NoQueueBilling
npm install
npx expo start
```

## Deploy the backend

```bash
cd NoQueueBilling/backend
sam build && sam deploy --guided
```

Set env vars in `backend/.env` or SAM parameter overrides. Copy `.env.example` from project root for the full list.

## Recommendations (Amazon Personalize)

To power the **Recommendations** section on the Home screen with personalized product picks, create an AWS Personalize campaign and pass its ARN to the backend. Step-by-step: **[Connect AWS Personalize campaign](docs/AWS_PERSONALIZE_SETUP.md)**.

## Demo the exit gate

1. Host `exit-gate/index.html` on S3 (or any static host). Set `API_URL` in the file to your API Gateway base URL.
2. Open the page on a tablet, scan the receipt QR from the app (Payment → Receipt screen). Valid receipts turn the screen green; already-used or invalid show red/orange.
