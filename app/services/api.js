const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "";

const defaultHeaders = {
    "Content-Type": "application/json",
};

async function handleResponse(response) {
    if (!response.ok) {
        const text = await response.text();
        let errorMessage = `Request failed: ${response.status}`;
        try {
            const json = JSON.parse(text);
            if (json.message) errorMessage = json.message;
            else if (json.error) errorMessage = json.error;
        } catch (_) {
            if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
    }
    return response.json();
}

export async function getProduct(barcode, storeId) {
    const url = `${BASE_URL}/product/${encodeURIComponent(barcode)}?store_id=${encodeURIComponent(storeId)}`;
    const response = await fetch(url, { method: "GET", headers: defaultHeaders });
    return handleResponse(response);
}

export async function getOffers(storeId) {
    const url = `${BASE_URL}/store/${encodeURIComponent(storeId)}/offers`;
    const response = await fetch(url, { method: "GET", headers: defaultHeaders });
    return handleResponse(response);
}

export async function searchProducts(storeId, query) {
    const url = new URL(`${BASE_URL}/store/${encodeURIComponent(storeId)}/products`);
    if (query && query.trim()) url.searchParams.set("q", query.trim());
    const response = await fetch(url.toString(), { method: "GET", headers: defaultHeaders });
    return handleResponse(response);
}

export async function getRecommendations(userId) {
    const url = `${BASE_URL}/recommendations/${encodeURIComponent(userId)}`;
    const response = await fetch(url, { method: "GET", headers: defaultHeaders });
    return handleResponse(response);
}

export async function initiatePayment(payload) {
    const url = `${BASE_URL}/payment/initiate`;
    const response = await fetch(url, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
}

export async function verifyReceipt(transactionId, signature) {
    const url = `${BASE_URL}/receipt/verify`;
    const response = await fetch(url, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify({ transaction_id: transactionId, signature }),
    });
    return handleResponse(response);
}

export async function sendChatMessage(message, storeId) {
    const url = `${BASE_URL}/chatbot`;
    const response = await fetch(url, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify({ message, store_id: storeId }),
    });
    return handleResponse(response);
}

export async function getOrders(userId) {
    const url = `${BASE_URL}/orders/${encodeURIComponent(userId)}`;
    const response = await fetch(url, { method: "GET", headers: defaultHeaders });
    return handleResponse(response);
}

export async function getReceipt(transactionId) {
    const url = `${BASE_URL}/receipt/${encodeURIComponent(transactionId)}`;
    const response = await fetch(url, { method: "GET", headers: defaultHeaders });
    return handleResponse(response);
}
