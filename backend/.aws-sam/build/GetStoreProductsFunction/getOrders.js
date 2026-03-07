const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
};

exports.handler = async (event) => {
    const { user_id } = event.pathParameters || {};

    if (!user_id) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Missing user_id in path" }),
        };
    }

    const bucketName = process.env.MOCK_DATA_BUCKET;
    const prefix = `orders/${user_id}/`;

    try {
        const keys = [];
        let continuationToken;

        do {
            const listResponse = await s3Client.send(new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            }));
            const contents = listResponse.Contents || [];
            for (const obj of contents) {
                if (obj.Key) keys.push(obj.Key);
            }
            continuationToken = listResponse.NextContinuationToken;
        } while (continuationToken);

        if (keys.length === 0) {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify([]),
            };
        }

        const orders = await Promise.all(
            keys.map(async (Key) => {
                const response = await s3Client.send(new GetObjectCommand({
                    Bucket: bucketName,
                    Key,
                }));
                const dataStr = await response.Body.transformToString();
                const raw = JSON.parse(dataStr);
                return {
                    transaction_id: raw.transaction_id,
                    timestamp: raw.timestamp,
                    cart_total: raw.cart_total,
                    items: raw.items || [],
                    store_id: raw.store_id,
                };
            })
        );

        orders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(orders),
        };
    } catch (error) {
        console.error("getOrders Error:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Could not fetch orders" }),
        };
    }
};
