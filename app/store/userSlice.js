import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    userId: null,
    name: null,
    selectedStore: "STORE_001",
    storeName: "Main Street Supermarket",
    accountAgeDays: 0,
};

const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        setUser(state, action) {
            const { userId, name, accountAgeDays } = action.payload;
            state.userId = userId ?? null;
            state.name = name ?? null;
            state.accountAgeDays = accountAgeDays ?? 0;
        },
        setStore(state, action) {
            const { storeId, storeName } = action.payload;
            state.selectedStore = storeId ?? state.selectedStore;
            state.storeName = storeName ?? state.storeName;
        },
        clearUser() {
            return initialState;
        },
    },
});

export const { setUser, setStore, clearUser } = userSlice.actions;
export default userSlice.reducer;
