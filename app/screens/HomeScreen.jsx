import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, CommonActions } from "@react-navigation/native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useAppSelector, useAppDispatch } from "../store";
import { addItem } from "../store/cartSlice";
import { setStore, clearUser } from "../store/userSlice";
import { getOffers, getRecommendations, getOrders, searchProducts } from "../services/api";
import * as auth from "../services/auth";
import OfferBanner from "../components/OfferBanner";
import RecommendationCard from "../components/RecommendationCard";

const BG = "#F7F7F7";
const CARD_BG = "#FFFFFF";
const ACCENT = "#00B14F";
const BADGE = "#FFE500";
const TEXT = "#111111";
const MUTED = "#888888";
const BORDER = "#EBEBEB";
const SECTION_GAP = 24;
const H_PADDING = 16;

const DEMO_STORES = [
    { id: "STORE_001", name: "Main Street Supermarket" },
    { id: "STORE_002", name: "Mall of India Store" },
];

// TODO: Replace with API call when backend is ready
const USE_MOCK_DATA = true;
const MOCK_GREETING_NAME = "Arjun";
const MOCK_OFFERS = [
    { offer_id: "OFFER-001", store_id: "STORE_001", title: "15% off Dairy", description: "Get 15% off on select Amul dairy products.", discount_pct: 15, discount_flat: null, product_ids: ["PROD-0001", "PROD-0011"], valid_until: "2026-12-31T23:59:00Z", code: "DAIRY15" },
    { offer_id: "OFFER-002", store_id: "STORE_001", title: "10% off Snacks", description: "10% off on biscuits, ketchup and cookies.", discount_pct: 10, discount_flat: null, product_ids: ["PROD-0004", "PROD-0006", "PROD-0008"], valid_until: "2026-12-31T23:59:00Z", code: null },
    { offer_id: "OFFER-003", store_id: "STORE_001", title: "Rs 50 off Beverages", description: "Flat Rs 50 off on tea and coffee.", discount_pct: 0, discount_flat: 50, product_ids: ["PROD-0003", "PROD-0018"], valid_until: "2026-12-31T23:59:00Z", code: "BEV50" },
];
const MOCK_RECOMMENDATIONS = [
    { product_id: "PROD-0001", store_id: "STORE_001", name: "Amul Butter 500g", brand: "Amul", base_price: 285, discounted_price: 242, aisle: "2A", reason: "Pairs with your last scan" },
    { product_id: "PROD-0002", store_id: "STORE_001", name: "Fortune Sunlite Refined Sunflower Oil 1L", brand: "Fortune", base_price: 245, discounted_price: null, aisle: "1A", reason: "Based on weekly purchase" },
    { product_id: "PROD-0003", store_id: "STORE_001", name: "Tata Tea Gold 500g", brand: "Tata", base_price: 320, discounted_price: 279, aisle: "3A", reason: "Bought every few days" },
];
const MOCK_LAST_ORDER = {
    transaction_id: "TXN_MOCK001",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    cart_total: 342,
    store_id: "STORE_001",
    items: [
        { product_id: "PROD-0001", name: "Amul Butter 500g", base_price: 285, discounted_price: 242, quantity: 1, aisle: "2A" },
        { product_id: "PROD-0006", name: "Parle-G Gold Biscuits 1kg", base_price: 65, discounted_price: 55, quantity: 1, aisle: "4B" },
        { product_id: "PROD-0013", name: "Britannia Milk Bread 400g", base_price: 45, discounted_price: 39, quantity: 1, aisle: "2B" },
    ],
};

// Mock product list for search when USE_MOCK_DATA (filtered by store + query)
const MOCK_PRODUCTS = [
    { product_id: "PROD-0001", store_id: "STORE_001", name: "Amul Butter 500g", brand: "Amul", category: "dairy", base_price: 285, discounted_price: 242, aisle: "2A" },
    { product_id: "PROD-0002", store_id: "STORE_001", name: "Fortune Sunlite Refined Sunflower Oil 1L", brand: "Fortune", category: "grains", base_price: 245, discounted_price: null, aisle: "1A" },
    { product_id: "PROD-0003", store_id: "STORE_001", name: "Tata Tea Gold 500g", brand: "Tata", category: "beverages", base_price: 320, discounted_price: 279, aisle: "3A" },
    { product_id: "PROD-0004", store_id: "STORE_001", name: "Britannia Good Day Butter Cookies 600g", brand: "Britannia", category: "snacks", base_price: 95, discounted_price: null, aisle: "4A" },
    { product_id: "PROD-0005", store_id: "STORE_001", name: "Dabur Chyawanprash 1kg", brand: "Dabur", category: "personal care", base_price: 425, discounted_price: 379, aisle: "5A" },
    { product_id: "PROD-0006", store_id: "STORE_001", name: "Parle-G Gold Biscuits 1kg", brand: "Parle", category: "snacks", base_price: 65, discounted_price: 55, aisle: "4B" },
    { product_id: "PROD-0007", store_id: "STORE_001", name: "MTR Gulab Jamun Mix 500g", brand: "MTR", category: "grains", base_price: 125, discounted_price: null, aisle: "1B" },
    { product_id: "PROD-0008", store_id: "STORE_001", name: "Kissan Fresh Tomato Ketchup 950g", brand: "Kissan", category: "snacks", base_price: 185, discounted_price: null, aisle: "4A" },
    { product_id: "PROD-0009", store_id: "STORE_001", name: "Nestle Maggi 2-Minute Noodles Masala 12-pack", brand: "Nestle", category: "snacks", base_price: 240, discounted_price: null, aisle: "4B" },
    { product_id: "PROD-0010", store_id: "STORE_001", name: "Colgate MaxFresh Toothpaste 150g", brand: "Colgate", category: "personal care", base_price: 95, discounted_price: null, aisle: "5A" },
    { product_id: "PROD-0011", store_id: "STORE_001", name: "Amul Fresh Cream 200ml", brand: "Amul", category: "dairy", base_price: 65, discounted_price: 55, aisle: "2A" },
    { product_id: "PROD-0012", store_id: "STORE_001", name: "Fortune Rice Bran Oil 1L", brand: "Fortune", category: "grains", base_price: 220, discounted_price: null, aisle: "1A" },
    { product_id: "PROD-0013", store_id: "STORE_001", name: "Britannia Milk Bread 400g", brand: "Britannia", category: "snacks", base_price: 45, discounted_price: 39, aisle: "2B" },
];

function formatOrderDate(timestamp) {
    if (timestamp == null) return "";
    const date = new Date(typeof timestamp === "number" ? timestamp : timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
}

export default function HomeScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const dispatch = useAppDispatch();
    const { name, userId, selectedStore, storeName } = useAppSelector((s) => s.user);

    const [offers, setOffers] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [lastOrder, setLastOrder] = useState(null);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [offersLoading, setOffersLoading] = useState(false);
    const [recsLoading, setRecsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [storePickerOpen, setStorePickerOpen] = useState(false);

    const currentStore = DEMO_STORES.find((s) => s.id === selectedStore) || DEMO_STORES[0];
    const showOffersOnly = route.params?.showOffers === true;

    useEffect(() => {
        if (USE_MOCK_DATA) {
            setOffers(MOCK_OFFERS);
            setOffersLoading(false);
            return;
        }
        if (!selectedStore) return;
        setOffersLoading(true);
        getOffers(selectedStore)
            .then(setOffers)
            .catch(() => setOffers([]))
            .finally(() => setOffersLoading(false));
    }, [selectedStore]);

    useEffect(() => {
        if (USE_MOCK_DATA) {
            setRecommendations(MOCK_RECOMMENDATIONS);
            setRecsLoading(false);
            return;
        }
        if (!userId) return;
        setRecsLoading(true);
        getRecommendations(userId)
            .then(setRecommendations)
            .catch(() => setRecommendations([]))
            .finally(() => setRecsLoading(false));
    }, [userId]);

    useEffect(() => {
        if (USE_MOCK_DATA) {
            setLastOrder(MOCK_LAST_ORDER);
            setOrdersLoading(false);
            return;
        }
        if (!userId) return;
        setOrdersLoading(true);
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
                setLastOrder(merged.length > 0 ? merged[0] : null);
            })
            .catch(() => setLastOrder(null))
            .finally(() => setOrdersLoading(false));
    }, [userId]);

    // Search products in selected store (debounced when using API)
    useEffect(() => {
        const store = selectedStore || currentStore?.id;
        if (!store) {
            setSearchResults([]);
            return;
        }
        const q = searchQuery.trim().toLowerCase();
        if (!q) {
            setSearchResults([]);
            return;
        }
        if (USE_MOCK_DATA) {
            const filtered = MOCK_PRODUCTS.filter(
                (p) => p.store_id === store &&
                    (p.name.toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q))
            );
            setSearchResults(filtered);
            return;
        }
        const t = setTimeout(() => {
            setSearchLoading(true);
            searchProducts(store, searchQuery)
                .then(setSearchResults)
                .catch(() => setSearchResults([]))
                .finally(() => setSearchLoading(false));
        }, 300);
        return () => clearTimeout(t);
    }, [searchQuery, selectedStore, currentStore?.id]);

    const handleReorder = () => {
        if (!lastOrder?.items?.length) return;
        lastOrder.items.forEach((item) => {
            dispatch(
                addItem({
                    product_id: item.product_id,
                    name: item.name,
                    base_price: item.base_price,
                    discounted_price: item.discounted_price ?? null,
                    aisle: item.aisle ?? "",
                    store_id: lastOrder.store_id ?? selectedStore,
                })
            );
        });
        navigation.navigate("Cart");
    };

    const openChatbot = (prefill) => {
        navigation.navigate("Chatbot", prefill ? { prefill } : {});
    };

    const handleLogout = async () => {
        try {
            if (auth.isAuthConfigured()) await auth.signOut();
        } catch (_) {}
        dispatch(clearUser());
        const stackNav = navigation.getParent()?.getParent();
        if (stackNav) {
            stackNav.dispatch(
                CommonActions.reset({ index: 0, routes: [{ name: "Auth" }] })
            );
        }
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* 1. HEADER */}
            <View style={styles.section}>
                <View style={styles.headerRow}>
                    <Text style={styles.greeting}>Hello, {name || "Guest"} 👋</Text>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                        <MaterialIcons name="logout" size={22} color={TEXT} />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={styles.storePill}
                    onPress={() => setStorePickerOpen(!storePickerOpen)}
                >
                    <Text style={styles.storePillText} numberOfLines={1}>
                        {currentStore.id} – {currentStore.name}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={20} color={TEXT} />
                </TouchableOpacity>
                {storePickerOpen && (
                    <View style={styles.storeList}>
                        {DEMO_STORES.map((s) => (
                            <TouchableOpacity
                                key={s.id}
                                style={styles.storeOption}
                                onPress={() => {
                                    setStorePickerOpen(false);
                                    dispatch(setStore({ storeId: s.id, storeName: s.name }));
                                }}
                            >
                                <Text style={styles.storeOptionText}>{s.id} – {s.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
                <View style={styles.searchWrap}>
                    <MaterialIcons name="search" size={20} color={MUTED} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search products..."
                        placeholderTextColor={MUTED}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Search results (products in selected store) */}
            {searchQuery.trim() !== "" && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Search results</Text>
                    {searchLoading ? (
                        <ActivityIndicator size="small" color={ACCENT} style={styles.loader} />
                    ) : searchResults.length === 0 ? (
                        <Text style={styles.mutedText}>No products found. Try a different search.</Text>
                    ) : (
                        <FlatList
                            data={searchResults}
                            horizontal
                            keyExtractor={(item) => item.product_id}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.hList}
                            renderItem={({ item }) => (
                                <RecommendationCard item={item} onPress={() => {}} />
                            )}
                        />
                    )}
                </View>
            )}
            {/* 2. SMART OFFERS */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Smart Offers</Text>
                {offersLoading ? (
                    <ActivityIndicator size="small" color={ACCENT} style={styles.loader} />
                ) : (
                    <FlatList
                        data={offers}
                        horizontal
                        keyExtractor={(item) => item.offer_id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.hList}
                        renderItem={({ item }) => (
                            <OfferBanner offer={item} onPress={() => {}} />
                        )}
                    />
                )}
            </View>

            {/* 3. SUGGESTED FOR YOU */}
            {!showOffersOnly && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Suggested For You</Text>
                    {recsLoading ? (
                        <ActivityIndicator size="small" color={ACCENT} style={styles.loader} />
                    ) : (
                        <FlatList
                            data={recommendations}
                            horizontal
                            keyExtractor={(item, i) => item.name + i}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.hList}
                            renderItem={({ item }) => (
                                <RecommendationCard item={item} onPress={() => {}} />
                            )}
                        />
                    )}
                </View>
            )}

            {/* 4. RECENT ORDERS */}
            {!showOffersOnly && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Orders</Text>
                    {ordersLoading ? (
                        <ActivityIndicator size="small" color={ACCENT} style={styles.loader} />
                    ) : lastOrder ? (
                        <View style={styles.card}>
                            <Text style={styles.orderTitle}>Your Last Order</Text>
                            <Text style={styles.orderMeta}>
                                {lastOrder.items?.length ?? 0} items · ₹{lastOrder.cart_total ?? 0} ·{" "}
                                {formatOrderDate(lastOrder.timestamp ?? lastOrder.paid_at)}
                            </Text>
                            <TouchableOpacity style={styles.reorderBtn} onPress={handleReorder}>
                                <Text style={styles.reorderBtnText}>Reorder</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.viewAllLink}
                                onPress={() => navigation.navigate("MyOrders")}
                            >
                                <Text style={styles.viewAllText}>View all orders →</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.card}>
                            <Text style={styles.mutedText}>No orders yet</Text>
                            <Text style={styles.viewAllText} onPress={() => navigation.navigate("MyOrders")}>
                                View orders →
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* 5. AI CHATBOT CARD */}
            {!showOffersOnly && (
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => openChatbot()}
                        activeOpacity={0.85}
                    >
                        <View style={styles.chatbotRow}>
                            <MaterialIcons name="auto-awesome" size={24} color={ACCENT} />
                            <Text style={styles.chatbotTitle}>Ask AI Assistant</Text>
                        </View>
                        <Text style={styles.chatbotHint}>
                            Get product locations, deals, and tips
                        </Text>
                        <View style={styles.chipRow}>
                            <TouchableOpacity
                                style={styles.chip}
                                onPress={() => openChatbot("Where is the organic honey?")}
                            >
                                <Text style={styles.chipText}>Where is organic honey?</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.chip}
                                onPress={() => openChatbot("Best deals today?")}
                            >
                                <Text style={styles.chipText}>Best deals today?</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            <View style={{ height: SECTION_GAP + 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    content: { paddingHorizontal: H_PADDING, paddingTop: 16, paddingBottom: 24 },
    section: { marginBottom: SECTION_GAP },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#222222",
        marginBottom: 12,
    },
    greeting: {
        fontSize: 22,
        fontWeight: "700",
        color: TEXT,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    logoutBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    logoutText: { fontSize: 14, color: TEXT, fontWeight: "500" },
    storePill: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: CARD_BG,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: BORDER,
        marginBottom: 12,
    },
    storePillText: { fontSize: 14, color: TEXT, marginRight: 4, maxWidth: 200 },
    storeList: { marginBottom: 8 },
    storeOption: { paddingVertical: 10, paddingHorizontal: 4 },
    storeOptionText: { fontSize: 14, color: TEXT },
    searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: CARD_BG,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: BORDER,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
    },
    searchInput: { flex: 1, fontSize: 15, color: TEXT, padding: 0 },
    hList: { paddingRight: H_PADDING },
    loader: { paddingVertical: 16 },
    card: {
        backgroundColor: CARD_BG,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: BORDER,
    },
    orderTitle: { fontSize: 16, fontWeight: "600", color: TEXT },
    orderMeta: { fontSize: 13, color: MUTED, marginTop: 4 },
    reorderBtn: {
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: BORDER,
        alignSelf: "flex-start",
    },
    reorderBtnText: { fontSize: 14, fontWeight: "600", color: TEXT },
    viewAllLink: { marginTop: 12 },
    viewAllText: { fontSize: 14, color: ACCENT, fontWeight: "500" },
    mutedText: { fontSize: 14, color: MUTED },
    chatbotRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    chatbotTitle: { fontSize: 17, fontWeight: "700", color: TEXT },
    chatbotHint: { fontSize: 13, color: MUTED, marginTop: 6 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    chip: {
        backgroundColor: BG,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: BORDER,
    },
    chipText: { fontSize: 13, color: TEXT },
});
