const Razorpay = require("razorpay");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
};

// FRAUD DETECTION RULES
// Rule 1: New account (< 3 days old) + high value order (> ₹5000) = BLOCK
// Rule 2: Unusually high item count (> 50 items) = REVIEW
// Rule 3: Normal transaction = APPROVE
// Note: These rules mirror AWS Fraud Detector's
// velocity and account-age based detection patterns
function simulateFraudCheck({ cart_total, account_age_days, item_count }) {
    if (account_age_days < 3 && cart_total > 5000) return "BLOCK";
    if (item_count > 50) return "REVIEW";
    return "APPROVE";
}

exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: corsHeaders, body: "" };
    }

    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    } catch {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "Invalid JSON body" }),
        };
    }

    const {
        user_id,
        cart_total,
        item_count,
        account_age_days,
        payment_method,
        store_id,
        items,
        store_lat_long,
        user_lat_long,
    } = body;

    try {
        const outcome = simulateFraudCheck({ cart_total, account_age_days, item_count });
        console.log("Fraud check result:", outcome, { cart_total, account_age_days, item_count });

        if (outcome === "BLOCK") {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Transaction blocked: suspicious activity",
                    fraud_outcome: "BLOCK",
                }),
            };
        }

        // Razorpay order
        const keyId = process.env.RZP_KEY_ID;
        const keySecret = process.env.RZP_KEY_SECRET;
        const amountPaise = Math.round(Number(cart_total) * 100);

        if (!keyId || !keySecret) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: "Payment configuration missing" }),
            };
        }

        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const notes = {
            user_id: String(user_id || "anonymous"),
            store_id: String(store_id || "STORE_001"),
            items: JSON.stringify(Array.isArray(items) ? items : []),
        };
        const order = await razorpay.orders.create({
            amount: amountPaise,
            currency: "INR",
            notes,
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                order_id: order.id,
                fraud_outcome: outcome,
                amount: amountPaise,
            }),
        };
    } catch (error) {
        console.error("initiatePayment Error:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message || "Could not initiate payment" }),
        };
    }
};
