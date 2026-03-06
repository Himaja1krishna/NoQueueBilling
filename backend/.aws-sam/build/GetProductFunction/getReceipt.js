const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
};

const STORE_NAMES = {
    STORE_001: "Main Street Supermarket",
    STORE_002: "Mall of India Store",
};

function mapItem(item) {
    return {
        name: item.name ?? "",
        brand: item.brand ?? "",
        quantity: item.quantity ?? 1,
        base_price: item.base_price ?? 0,
        discounted_price: item.discounted_price ?? null,
        aisle: item.aisle ?? "",
    };
}

exports.handler = async (event) => {
    const { transaction_id } = event.pathParameters || {};

    if (!transaction_id) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Missing transaction_id in path" }),
        };
    }

    const bucketName = process.env.MOCK_DATA_BUCKET;
    if (!bucketName) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "MOCK_DATA_BUCKET not configured" }),
        };
    }

    try {
        const listResponse = await s3Client.send(new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: "orders/",
        }));
        const suffix = `/${transaction_id}.json`;
        const key = (listResponse.Contents || []).find((o) => o.Key && o.Key.endsWith(suffix))?.Key;

        if (!key) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Receipt not found" }),
            };
        }

        const getResponse = await s3Client.send(new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        }));
        const dataStr = await getResponse.Body.transformToString();
        const record = JSON.parse(dataStr);

        const items = (record.items || []).map(mapItem);
        const cart_total = Number(record.cart_total) || 0;

        let savings_total = 0;
        for (const it of record.items || []) {
            const base = Number(it.base_price) || 0;
            const disc = it.discounted_price != null ? Number(it.discounted_price) : null;
            const qty = it.quantity ?? 1;
            if (disc != null && disc < base) {
                savings_total += (base - disc) * qty;
            }
        }
        const gst_amount = Math.round((cart_total * 0.05 / 1.05) * 100) / 100;
        const final_total = cart_total;

        const expires_at = record.expires_at;
        const is_expired = !!(expires_at && new Date() > new Date(expires_at));

        const receipt = {
            transaction_id: record.transaction_id,
            paid_at: record.paid_at,
            expires_at: record.expires_at,
            store_id: record.store_id,
            store_name: STORE_NAMES[record.store_id] || record.store_id || "",
            cart_total,
            items,
            savings_total: Math.round(savings_total * 100) / 100,
            gst_amount,
            final_total,
            payment_method: record.payment_method || "UPI",
            status: record.status || "PAID",
            is_expired,
        };

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(receipt),
        };
    } catch (error) {
        console.error("getReceipt Error:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Could not fetch receipt" }),
        };
    }
};
