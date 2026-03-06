import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useAppSelector } from "../store";
import { getOffers } from "../services/api";
import CartItem from "../components/CartItem";

const BG = "#F7F7F7";
const CARD_BG = "#FFFFFF";
const ACCENT = "#00B14F";
const SAVINGS_BG = "#F0FBF4";
const TEXT = "#111111";
const MUTED = "#888888";
const BORDER = "#EBEBEB";
const H_PADDING = 16;

function computeAppliedOffers(cartItems, offers) {
    const applied = [];
    const cartIds = new Set(cartItems.map((i) => i.product_id));
    for (const offer of offers) {
        const matching = offer.product_ids.filter((id) => cartIds.has(id));
        if (matching.length === 0) continue;
        let discountAmount = 0;
        if (offer.discount_flat != null && offer.discount_flat > 0) {
            discountAmount = offer.discount_flat;
        } else if (offer.discount_pct != null && offer.discount_pct > 0) {
            for (const item of cartItems) {
                if (!matching.includes(item.product_id)) continue;
                const base = item.base_price ?? 0;
                discountAmount += base * item.quantity * (offer.discount_pct / 100);
            }
        }
        if (discountAmount > 0) {
            applied.push({ ...offer, discountAmount: Math.round(discountAmount) });
        }
    }
    return applied;
}

export default function CartScreen() {
    const navigation = useNavigation();
    const { items, total: subtotal } = useAppSelector((s) => s.cart);
    const selectedStore = useAppSelector((s) => s.user.selectedStore);

    const [offers, setOffers] = useState([]);
    const [offersLoading, setOffersLoading] = useState(true);
    const [couponCode, setCouponCode] = useState("");

    useEffect(() => {
        if (!selectedStore) {
            setOffers([]);
            setOffersLoading(false);
            return;
        }
        setOffersLoading(true);
        getOffers(selectedStore)
            .then(setOffers)
            .catch(() => setOffers([]))
            .finally(() => setOffersLoading(false));
    }, [selectedStore]);

    const appliedOffers = useMemo(
        () => computeAppliedOffers(items, offers),
        [items, offers]
    );
    const totalSavings = appliedOffers.reduce((s, o) => s + o.discountAmount, 0);
    const afterSavings = Math.max(0, subtotal - totalSavings);
    const tax = afterSavings * 0.05;
    const finalTotal = Math.round(afterSavings + tax);
    const itemCount = items.reduce((c, i) => c + i.quantity, 0);

    const handlePay = () => {
        navigation.navigate("Payment", {
            finalTotal,
            itemCount,
            cartItems: items,
        });
    };

    if (items.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Your Cart</Text>
                    <Text style={styles.count}>0 items</Text>
                </View>
                <View style={styles.empty}>
                    <MaterialIcons name="shopping-cart" size={64} color={BORDER} />
                    <Text style={styles.emptyText}>Your cart is empty</Text>
                    <Text style={styles.emptySub}>Scan items or add from Home</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Your Cart</Text>
                <Text style={styles.count}>{itemCount} items</Text>
            </View>

            <FlatList
                data={items}
                keyExtractor={(item) => item.product_id}
                renderItem={({ item }) => <CartItem item={item} />}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        <Text style={styles.sectionLabel}>Items</Text>
                    </View>
                }
                ListFooterComponent={
                    <>
                        {/* Smart Savings */}
                        <View style={styles.savingsCard}>
                            <View style={styles.savingsHeader}>
                                <MaterialIcons name="auto-awesome" size={18} color={ACCENT} />
                                <Text style={styles.savingsTitle}> ✦ Smart Savings</Text>
                            </View>
                            <Text style={styles.savingsSub}>
                                ₹{totalSavings} saved · Thanks to AI-suggested bundles
                            </Text>
                            {appliedOffers.length > 0 && (
                                <View style={styles.offerList}>
                                    {appliedOffers.map((o) => (
                                        <View key={o.offer_id} style={styles.offerRow}>
                                            <Text style={styles.offerTitle} numberOfLines={1}>
                                                {o.title}
                                            </Text>
                                            <Text style={styles.offerDiscount}>
                                                -₹{o.discountAmount}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                            {appliedOffers.length === 0 && !offersLoading && (
                                <Text style={styles.noOffers}>No offers apply to your cart</Text>
                            )}
                            {offersLoading && (
                                <ActivityIndicator size="small" color={ACCENT} style={{ marginTop: 8 }} />
                            )}
                        </View>

                        {/* Coupon */}
                        <View style={styles.couponRow}>
                            <TextInput
                                style={styles.couponInput}
                                placeholder="Coupon code"
                                placeholderTextColor={MUTED}
                                value={couponCode}
                                onChangeText={setCouponCode}
                            />
                            <TouchableOpacity style={styles.applyBtn}>
                                <Text style={styles.applyBtnText}>Apply</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Payment breakdown */}
                        <View style={styles.breakdownCard}>
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Subtotal</Text>
                                <Text style={styles.breakdownValue}>₹{Math.round(subtotal)}</Text>
                            </View>
                            {totalSavings > 0 && (
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Savings</Text>
                                    <Text style={styles.breakdownSavings}>-₹{totalSavings}</Text>
                                </View>
                            )}
                            <View style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel}>Tax / GST (5%)</Text>
                                <Text style={styles.breakdownValue}>₹{Math.round(tax)}</Text>
                            </View>
                            <View style={[styles.breakdownRow, styles.finalRow]}>
                                <Text style={styles.finalLabel}>Final Total</Text>
                                <Text style={styles.finalValue}>₹{finalTotal}</Text>
                            </View>
                        </View>

                        <View style={styles.bottomSpacer} />
                    </>
                }
            />

            <View style={styles.stickyBottom}>
                <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.9}>
                    <Text style={styles.payBtnText}>Pay ₹{finalTotal}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: H_PADDING,
        paddingTop: 56,
        paddingBottom: 16,
        backgroundColor: "#fff",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: BORDER,
    },
    title: { fontSize: 22, fontWeight: "700", color: TEXT },
    count: { fontSize: 14, color: MUTED },
    listContent: { paddingBottom: 24 },
    listHeader: {
        paddingHorizontal: H_PADDING,
        paddingTop: 12,
        paddingBottom: 8,
    },
    sectionLabel: { fontSize: 13, fontWeight: "600", color: MUTED, textTransform: "uppercase" },
    empty: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
    },
    emptyText: { fontSize: 18, fontWeight: "600", color: TEXT },
    emptySub: { fontSize: 14, color: MUTED },
    savingsCard: {
        marginHorizontal: H_PADDING,
        marginTop: 24,
        padding: 16,
        backgroundColor: SAVINGS_BG,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(0, 177, 79, 0.2)",
    },
    savingsHeader: { flexDirection: "row", alignItems: "center" },
    savingsTitle: { fontSize: 16, fontWeight: "700", color: TEXT },
    savingsSub: { fontSize: 13, color: MUTED, marginTop: 4 },
    offerList: { marginTop: 12, gap: 6 },
    offerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    offerTitle: { fontSize: 13, color: TEXT, flex: 1, marginRight: 8 },
    offerDiscount: { fontSize: 13, fontWeight: "700", color: ACCENT },
    noOffers: { fontSize: 13, color: MUTED, marginTop: 8 },
    couponRow: {
        flexDirection: "row",
        marginHorizontal: H_PADDING,
        marginTop: 16,
        gap: 10,
    },
    couponInput: {
        flex: 1,
        height: 44,
        backgroundColor: CARD_BG,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: BORDER,
        paddingHorizontal: 14,
        fontSize: 15,
        color: TEXT,
    },
    applyBtn: {
        backgroundColor: ACCENT,
        paddingHorizontal: 20,
        borderRadius: 8,
        justifyContent: "center",
    },
    applyBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
    breakdownCard: {
        marginHorizontal: H_PADDING,
        marginTop: 16,
        padding: 16,
        backgroundColor: CARD_BG,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BORDER,
    },
    breakdownRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    finalRow: { marginTop: 8, marginBottom: 0, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER },
    breakdownLabel: { fontSize: 14, color: MUTED },
    breakdownValue: { fontSize: 14, color: TEXT },
    breakdownSavings: { fontSize: 14, fontWeight: "600", color: ACCENT },
    finalLabel: { fontSize: 16, fontWeight: "700", color: TEXT },
    finalValue: { fontSize: 18, fontWeight: "700", color: TEXT },
    bottomSpacer: { height: 100 },
    stickyBottom: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: H_PADDING,
        paddingBottom: 34,
        backgroundColor: "#fff",
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: BORDER,
    },
    payBtn: {
        backgroundColor: ACCENT,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    payBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
