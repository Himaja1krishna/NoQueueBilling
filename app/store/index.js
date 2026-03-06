import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import cartReducer from "./cartSlice";
import userReducer from "./userSlice";

const store = configureStore({
    reducer: {
        cart: cartReducer,
        user: userReducer,
    },
});

export default store;

/**
 * @typedef {ReturnType<typeof store.getState>} RootState
 * @typedef {typeof store.dispatch} AppDispatch
 */

/**
 * Typed hook for selecting from Redux state.
 * In TypeScript: use useAppSelector with RootState for inferred types.
 * @param {(state: RootState) => T} selector
 * @returns {T}
 */
export function useAppSelector(selector) {
    return useSelector(selector);
}

/**
 * Typed hook for dispatching actions.
 * In TypeScript: use useAppDispatch() for AppDispatch type.
 * @returns {AppDispatch}
 */
export function useAppDispatch() {
    return useDispatch();
}
