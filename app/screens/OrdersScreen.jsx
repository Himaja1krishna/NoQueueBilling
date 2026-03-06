import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useAppSelector, useAppDispatch } from "../store";
import { addItem } from "../store/cartSlice";
import { getOrders } from "../services/api";

const BG = "#F7F7F7";
const CARD_BG = "#FFFFFF";
const TEXT = "#111111";
const MUTED = "#888888";
const BORDER = "#EBEBEB";
const ACCENT = "#00B14F";
const H_PADDING = 16;

const DEMO_STORES = [
    { id: "STORE_001", name: "Main Street Supermarket" },
    { id: "STORE_002", name: "Mall of India Store" },
];

function formatOrderDate(ts) {
    if (ts == null) return "—";
    const d = new Date(typeof ts === "number" ? ts : ts);
    const day = d.getDate();
    const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec";
    const month = months.split(" ")[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
}

function getStoreName(storeId) {
    return DEMO_STORES.find((s) => s.id === storeId)?.name || storeId || "Store";
}

export default function OrdersScreen() {
    const navigation = useNavigation();
    const dispatch = useAppDispatch();
    const userId = useAppSelector((s) => s.user.userId);
    const name = useAppSelector((s) => s.user.name);
    const selectedStore = useAppSelector((s) => s.user.selectedStore);

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const displayName = name || (userId === "anonymous" || userId === "guest" ? "Guest" : userId) || "Guest";

    useEffect(() => {
        if (!userId) {
            setOrders([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const idsToFetch =
            userId === "guest" || userId === "anonymous"
                ? ["anonymous", "unknown"]
                : [userId];
        Promise.all(idsToFetch.map((id) => getOrders(id).catch(() => [])))
            .then((results) => {
                const seen = new Set();
                const merged = [];
                for (const list of results) {
                    for (const o of list) {
                        const key = o.transaction_id || o.paid_at || Math.random();
                        if (!seen.has(key)) {
                            seen.add(key);
                            merged.push(o);
                        }
                    }
                }
                merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                setOrders(merged);
            })
            .catch(() => setOrders([]))
            .finally(() => setLoading(false));
    }, [userId]);

    const handleReorder = (order) => {
        if (!order?.items?.length) return;
        const storeId = order.store_id ?? selectedStore;
        order.items.forEach((item) => {
            const qty = item.quantity ?? 1;
            for (let i = 0; i < qty; i++) {
                dispatch(
                    addItem({
                        product_id: item.product_id,
                        name: item.name,
                        base_price: item.base_price ?? 0,
                        discounted_price: item.discounted_price ?? null,
                        aisle: item.aisle ?? "",
                        store_id: storeId,
                    })
                );
            }
        });
        navigation.navigate("Cart");
    };

    const handleBack = () => {
        navigation.navigate("Home");
    };

    const renderOrderCard = ({ item: order }) => {
        const names = (order.items || [])
            .map((i) => i.name)
            .filter(Boolean)
            .slice(0, 3);
        return (
            <View style={styles.card}>
                <View style={styles.cardTop}>
                    <Text style={styles.date}>
                        {formatOrderDate(order.timestamp)}
                    </Text>
                    <Text style={styles.total}>₹{Math.round(order.cart_total ?? 0)}</Text>
                </View>
                <Text style={styles.storeName}>
                    {getStoreName(order.store_id)}
                </Text>
                {names.length > 0 && (
                    <View style={styles.pillRow}>
                        {names.map((name, idx) => (
                            <View key={idx} style={styles.pill}>
                                <Text style={styles.pillText} numberOfLines={1}>
                                    {name}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
                <TouchableOpacity
                    style={styles.reorderBtn}
                    onPress={() => handleReorder(order)}
                >
                    <Text style={styles.reorderBtnText}>Reorder</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderEmpty = () => (
        <View style={styles.empty}>
            <MaterialIcons name="shopping-bag" size={64} color={BORDER} />
            <Text style={styles.emptyText}>No orders yet. Start scanning!</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color={TEXT} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.greeting}>Hi, {displayName}</Text>
                    <Text style={styles.title}>My Orders</Text>
                </View>
                <View style={styles.headerRight} />
            </View>

            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={ACCENT} />
                </View>
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(o) => o.transaction_id || String(o.timestamp) || Math.random()}
                    renderItem={renderOrderCard}
                    contentContainerStyle={
                        orders.length === 0 ? styles.emptyContainer : styles.listContent
                    }
                    ListEmptyComponent={renderEmpty}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: H_PADDING,
        paddingTop: 56,
        paddingBottom: 16,
        backgroundColor: CARD_BG,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: BORDER,
    },
    backBtn: { padding: 4 },
    headerCenter: { flex: 1, marginLeft: 8 },
    greeting: { fontSize: 14, color: MUTED },
    title: { fontSize: 20, fontWeight: "700", color: TEXT },
    headerRight: { width: 32 },
    loading: { flex: 1, justifyContent: "center", alignItems: "center" },
    listContent: { padding: H_PADDING, paddingBottom: 24 },
    emptyContainer: { flex: 1, justifyContent: "center" },
    card: {
        backgroundColor: CARD_BG,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 16,
        marginBottom: 12,
    },
    cardTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    date: { fontSize: 14, color: TEXT },
    total: { fontSize: 16, fontWeight: "700", color: TEXT },
    storeName: { fontSize: 12, color: MUTED, marginTop: 6 },
    pillRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 10,
    },
    pill: {
        backgroundColor: "#E5E5E5",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        maxWidth: 120,
    },
    pillText: { fontSize: 10, color: MUTED },
    reorderBtn: {
        alignSelf: "flex-end",
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    reorderBtnText: { fontSize: 14, fontWeight: "600", color: ACCENT },
    empty: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 48,
        gap: 16,
    },
    emptyText: { fontSize: 16, color: MUTED },
});
