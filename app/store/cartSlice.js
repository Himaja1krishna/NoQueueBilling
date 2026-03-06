import { createSlice } from "@reduxjs/toolkit";

function cartItemFromProduct(product) {
    return {
        product_id: product.product_id,
        name: product.name,
        base_price: product.base_price ?? 0,
        discounted_price: product.discounted_price ?? null,
        quantity: 1,
        aisle: product.aisle ?? "",
        store_id: product.store_id ?? "",
    };
}

function computeTotal(items) {
    return items.reduce(
        (sum, item) => sum + (item.discounted_price ?? item.base_price) * item.quantity,
        0
    );
}

const initialState = {
    items: [],
    total: 0,
};

const cartSlice = createSlice({
    name: "cart",
    initialState,
    reducers: {
        addItem(state, action) {
            const product = action.payload;
            const existing = state.items.find((i) => i.product_id === product.product_id);
            if (existing) {
                existing.quantity += 1;
            } else {
                state.items.push(cartItemFromProduct(product));
            }
            state.total = computeTotal(state.items);
        },
        removeItem(state, action) {
            const productId = action.payload;
            const idx = state.items.findIndex((i) => i.product_id === productId);
            if (idx === -1) return;
            const item = state.items[idx];
            if (item.quantity > 1) {
                item.quantity -= 1;
            } else {
                state.items.splice(idx, 1);
            }
            state.total = computeTotal(state.items);
        },
        removeItemEntirely(state, action) {
            const productId = action.payload;
            const idx = state.items.findIndex((i) => i.product_id === productId);
            if (idx !== -1) {
                state.items.splice(idx, 1);
                state.total = computeTotal(state.items);
            }
        },
        clearCart() {
            return initialState;
        },
    },
});

export const { addItem, removeItem, removeItemEntirely, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
