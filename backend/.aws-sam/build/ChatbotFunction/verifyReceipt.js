const crypto = require("crypto");
const { KMSClient, VerifyCommand } = require("@aws-sdk/client-kms");
const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const kmsClient = new KMSClient({ region: process.env.AWS_REGION || "us-east-1" });
const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
};

function buildReceiptForVerify(record) {
    return {
        transaction_id: record.transaction_id,
        user_id: record.user_id,
        store_id: record.store_id,
        cart_total: record.cart_total,
        items: record.items,
        timestamp: record.timestamp,
        paid_at: record.paid_at,
        expires_at: record.expires_at,
        status: record.status,
        used_at_gate: record.used_at_gate,
    };
}

exports.handler = async (event) => {
    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    } catch {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ valid: false, reason: "INVALID_REQUEST" }),
        };
    }

    const { transaction_id: bodyTxn, signature: bodySig, token: bodyToken } = body;

    let transaction_id = bodyTxn;
    let signature = bodySig;

    if (bodyToken && typeof bodyToken === "string") {
        try {
            const decoded = JSON.parse(Buffer.from(bodyToken, "base64").toString("utf8"));
            if (decoded && decoded.transaction_id && decoded.signature) {
                transaction_id = decoded.transaction_id;
                signature = decoded.signature;
            }
        } catch (_) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ valid: false, reason: "INVALID_REQUEST" }),
            };
        }
    }

    if (!transaction_id || !signature) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ valid: false, reason: "INVALID_REQUEST" }),
        };
    }

    const bucketName = process.env.MOCK_DATA_BUCKET;
    const keyId = process.env.KMS_KEY_ID;

    if (!bucketName || !keyId) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ valid: false, reason: "SERVER_ERROR" }),
        };
    }

    try {
        // Step 1: Find order in S3 (key orders/{user_id}/{transaction_id}.json)
        const listResponse = await s3Client.send(new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: "orders/",
        }));
        const suffix = `/${transaction_id}.json`;
        const key = (listResponse.Contents || []).find((o) => o.Key && o.Key.endsWith(suffix))?.Key;

        if (!key) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ valid: false, reason: "NOT_FOUND" }),
            };
        }

        const getResponse = await s3Client.send(new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        }));
        const dataStr = await getResponse.Body.transformToString();
        const record = JSON.parse(dataStr);

        // Step 2: Check used_at_gate
        if (record.used_at_gate === true) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ valid: false, reason: "ALREADY_USED" }),
            };
        }

        // Step 2.5: Time expiry check
        const expires_at = record.expires_at;
        if (expires_at && new Date() > new Date(expires_at)) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ valid: false, reason: "QR_EXPIRED", expired_at: expires_at }),
            };
        }

        // Step 3: Rebuild receipt (same fields as confirmPayment, without signature)
        const receipt = buildReceiptForVerify(record);

        // Step 4: Verify KMS signature (digest mode — matches how confirmPayment signs)
        const messageStr = JSON.stringify(receipt);
        const digest = crypto.createHash("sha256").update(messageStr, "utf8").digest();
        const digestBytes = new Uint8Array(digest);
        const signatureBytes = Buffer.from(signature, "base64");

        const verifyResponse = await kmsClient.send(new VerifyCommand({
            KeyId: keyId,
            Message: digestBytes,
            MessageType: "DIGEST",
            Signature: signatureBytes,
            SigningAlgorithm: "RSASSA_PKCS1_V1_5_SHA_256",
        }));

        if (!verifyResponse.SignatureValid) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ valid: false, reason: "FAKE_RECEIPT" }),
            };
        }

        // Step 5: Update S3 — set used_at_gate: true
        const updatedRecord = { ...record, used_at_gate: true };
        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: JSON.stringify(updatedRecord),
            ContentType: "application/json",
        }));

        // Step 6: Return success (include transaction_id so exit gate can show details)
        const receiptForClient = {
            transaction_id: record.transaction_id,
            user_id: record.user_id,
            store_id: record.store_id,
            paid_at: record.paid_at,
            final_total: record.cart_total,
            items: record.items,
            store_name: record.store_name,
        };
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                valid: true,
                reason: "APPROVED",
                status: "VALID",
                transaction_id: record.transaction_id,
                receipt: receiptForClient,
            }),
        };
    } catch (error) {
        console.error("verifyReceipt Error:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ valid: false, reason: "SERVER_ERROR" }),
        };
    }
};
