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
    { product_id: "PROD-0001", store_id: "STORE_001", name: "Amul Butter 500g", brand: "Amul", base_price: 285, discounted_price: 242, aisle: "Aisle 3", reason: "Pairs with your last scan", image_url: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcQelhL6Pgbq781oEYQDG8nJc96RfAAmV4UsrJgs6OFEa9jMXovIHCjWcca2zrRGKne1XlJceqgr5nhKSPD8p29NKITr9j0VMQ" },
    { product_id: "PROD-0002", store_id: "STORE_001", name: "Fortune Sunlite Refined Sunflower Oil 1L", brand: "Fortune", base_price: 245, discounted_price: null, aisle: "Aisle 4", reason: "Based on weekly purchase", image_url: "data:image/jpeg;base64,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" },
    { product_id: "PROD-0003", store_id: "STORE_001", name: "Tata Tea Gold 500g", brand: "Tata", base_price: 320, discounted_price: 279, aisle: "Aisle 1", reason: "Bought every few days", image_url: "data:image/jpeg;base64,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" },
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

            {/* 3. RECOMMENDATIONS — separate section */}
            {!showOffersOnly && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recommendations</Text>
                    <Text style={styles.sectionSubtitle}>Personalized for you</Text>
                    {recsLoading ? (
                        <ActivityIndicator size="small" color={ACCENT} style={styles.loader} />
                    ) : (() => {
                        const forStore = (recommendations || []).filter(
                            (r) => !selectedStore || r.store_id === selectedStore
                        );
                        return forStore.length === 0 ? (
                            <Text style={styles.mutedText}>No recommendations yet. Start shopping to see personalized picks.</Text>
                        ) : (
                            <FlatList
                                data={forStore}
                                horizontal
                                keyExtractor={(item, i) => (item.product_id || item.name) + String(i)}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.hList}
                                renderItem={({ item }) => (
                                    <RecommendationCard
                                        item={item}
                                        onPress={() => {}}
                                    />
                                )}
                            />
                        );
                    })()}
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
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: MUTED,
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
