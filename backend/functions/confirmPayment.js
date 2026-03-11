const crypto = require("crypto");
const { KMSClient, SignCommand } = require("@aws-sdk/client-kms");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const kmsClient = new KMSClient({ region: process.env.AWS_REGION || "us-east-1" });
const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
};

exports.handler = async (event) => {
    const rawBody = typeof event.body === "string" ? event.body : JSON.stringify(event.body || {});

    // Step 1: Verify Razorpay webhook signature
    const webhookSecret = process.env.RZP_WEBHOOK_SECRET;
    const signatureHeader = event.headers?.["x-razorpay-signature"] || event.headers?.["X-Razorpay-Signature"];

    if (!webhookSecret || !signatureHeader) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Missing signature or webhook secret" }),
        };
    }

    const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody, "utf8")
        .digest("hex");

    if (signatureHeader !== expectedSignature) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Invalid signature" }),
        };
    }

    let payload;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Invalid JSON body" }),
        };
    }

    // Step 2: Parse payment entity from body.payload.payment.entity
    const paymentEntity = payload?.payload?.payment?.entity;
    if (!paymentEntity) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Missing payment entity in payload" }),
        };
    }

    const paymentId = paymentEntity.id;
    const amountPaise = Number(paymentEntity.amount) || 0;
    const cartTotal = amountPaise / 100;
    let notes = paymentEntity.notes || {};

    // If payment entity has no notes, fetch order from Razorpay (notes are on the order)
    if ((!notes.user_id || notes.user_id === "unknown") && paymentEntity.order_id) {
        try {
            const Razorpay = require("razorpay");
            const keyId = process.env.RZP_KEY_ID;
            const keySecret = process.env.RZP_KEY_SECRET;
            if (keyId && keySecret) {
                const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
                const order = await razorpay.orders.fetch(paymentEntity.order_id);
                if (order && order.notes && typeof order.notes === "object") {
                    notes = order.notes;
                }
            }
        } catch (err) {
            console.warn("confirmPayment: could not fetch order for notes", err.message);
        }
    }

    // user_id, store_id, items from notes (payment entity or fetched order)
    let user_id = notes.user_id || "unknown";
    const store_id = notes.store_id || "STORE_001";
    let items = [];
    if (Array.isArray(notes.items)) {
        items = notes.items;
    } else if (typeof notes.items === "string" && notes.items) {
        try {
            items = JSON.parse(notes.items);
            if (!Array.isArray(items)) items = [];
        } catch (_) {
            items = [];
        }
    }

    const transaction_id = `TXN_${paymentId?.replace("pay_", "") || Date.now()}`;

    // Step 3: Build receipt object (field order must match verifyReceipt rebuild for KMS verify)
    const now = Date.now();
    const receipt = {
        transaction_id,
        user_id,
        store_id,
        cart_total: cartTotal,
        items,
        timestamp: now,
        paid_at: new Date(now).toISOString(),
        expires_at: new Date(now + 60 * 60 * 1000).toISOString(),
        status: "PAID",
        used_at_gate: false,
    };

    const keyId = process.env.KMS_KEY_ID;
    const bucketName = process.env.MOCK_DATA_BUCKET;

    if (!keyId || !bucketName) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "KMS or S3 configuration missing" }),
        };
    }

    try {
        // Step 4: Sign receipt with AWS KMS (sign SHA-256 digest to stay under 4096-byte KMS limit)
        const messageStr = JSON.stringify(receipt);
        const digest = crypto.createHash("sha256").update(messageStr, "utf8").digest();
        const digestBytes = new Uint8Array(digest);

        const signResponse = await kmsClient.send(new SignCommand({
            KeyId: keyId,
            Message: digestBytes,
            MessageType: "DIGEST",
            SigningAlgorithm: "RSASSA_PKCS1_V1_5_SHA_256",
        }));

        const signature = Buffer.from(signResponse.Signature).toString("base64");

        // Signed token for QR: base64(JSON.stringify({ transaction_id, signature }))
        const signedToken = Buffer.from(
            JSON.stringify({ transaction_id, signature }),
            "utf8"
        ).toString("base64");

        // QR URL: guard scans → browser opens → exit gate page loads → auto-verifies.
        // Set EXIT_GATE_URL (or EXIT_GATE_BASE_URL) to your hosted exit-gate/index.html base URL.
        const exitGateBase = (process.env.EXIT_GATE_URL || process.env.EXIT_GATE_BASE_URL || "").trim();
        const qrUrl = exitGateBase
            ? (exitGateBase.replace(/\?.*$/, "").replace(/\/$/, "") + "?token=" + encodeURIComponent(signedToken))
            : null;

        // Step 5: Save to S3 at orders/{user_id}/{transaction_id}.json
        const s3Key = `orders/${user_id}/${transaction_id}.json`;
        const s3Body = JSON.stringify({ ...receipt, signature });

        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: s3Body,
            ContentType: "application/json",
        }));

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                receipt,
                signature,
                signed_token: signedToken,
                ...(qrUrl && { qr_url: qrUrl }),
            }),
        };
    } catch (error) {
        console.error("confirmPayment Error:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message || "Could not confirm payment" }),
        };
    }
};
