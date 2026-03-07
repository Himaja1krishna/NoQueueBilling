const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

exports.handler = async (event) => {
    const { store_id } = event.pathParameters || {};

    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
    };

    if (!store_id) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Missing store_id in path" }),
        };
    }

    const bucketName = process.env.MOCK_DATA_BUCKET;
    const key = "mock-store/offers.json";

    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        const response = await s3Client.send(command);
        const dataStr = await response.Body.transformToString();
        const offers = JSON.parse(dataStr);

        const now = new Date();
        const activeOffers = offers.filter(
            (o) => o.store_id === store_id && new Date(o.valid_until) > now
        );

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(activeOffers),
        };
    } catch (error) {
        console.error("getOffers S3 Error:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Could not fetch offers" }),
        };
    }
};
