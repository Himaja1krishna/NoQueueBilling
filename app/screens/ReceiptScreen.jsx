import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    ScrollView,
    Platform,
    Share,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import QRCode from "react-native-qrcode-svg";

import { useAppSelector, useAppDispatch } from "../store";
import { clearCart } from "../store/cartSlice";
import { getReceipt } from "../services/api";

const BG = "#0A0A0A";
const CHECK_GREEN = "#00FF87";
const WHITE = "#FFFFFF";
const MUTED = "#888888";
const MONO = "#666666";
const CARD_BG = "#FFFFFF";
const BORDER_GLOW = "#FFE500";
const ACCENT = "#00B14F";
const TIMER_YELLOW = "#FFE500";
const EXPIRED_RED = "#FF3B3B";

const monoFont = Platform.OS === "ios" ? "Menlo" : "monospace";

const DASHED_DIVIDER = "- - - - - - - - - - - - -";

function formatTimeLeft(ms) {
    if (ms <= 0) return "00:00";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatPaidAt(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    const day = d.getDate();
    const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec";
    const month = months.split(" ")[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const mins = d.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${day} ${month} ${year}, ${hours}:${String(mins).padStart(2, "0")} ${ampm}`;
}

export default function ReceiptScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const dispatch = useAppDispatch();
    const { transaction_id = "", signature = "" } = route.params || {};
    const storeName = useAppSelector((s) => s.user.storeName) || "Store";

    const [activeTab, setActiveTab] = useState("exitqr");
    const [receipt, setReceipt] = useState(null);
    const [timeLeftMs, setTimeLeftMs] = useState(null);
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const intervalRef = useRef(null);

    useEffect(() => {
        if (!transaction_id) return;
        getReceipt(transaction_id)
            .then(setReceipt)
            .catch(() => setReceipt(null));
    }, [transaction_id]);

    useEffect(() => {
        if (!receipt?.expires_at) return;
        const update = () => {
            const left = new Date(receipt.expires_at).getTime() - Date.now();
            setTimeLeftMs(left);
        };
        update();
        intervalRef.current = setInterval(update, 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [receipt?.expires_at]);

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 80,
            friction: 8,
        }).start();
    }, [scaleAnim]);

    const handleBackToHome = () => {
        dispatch(clearCart());
        navigation.reset({
            index: 0,
            routes: [{ name: "MainTabs", params: { screen: "Home" } }],
        });
    };

    const handleShare = async () => {
        if (!receipt) return;
        const lines = [
            receipt.store_name,
            DASHED_DIVIDER,
            `Order ID: ${receipt.transaction_id}`,
            `Date: ${formatPaidAt(receipt.paid_at)}`,
            `Payment: ${receipt.payment_method}`,
            DASHED_DIVIDER,
            ...(receipt.items || []).map(
                (i) =>
                    `${i.name}${i.brand ? ` (${i.brand})` : ""} x${i.quantity}  ₹${((i.discounted_price ?? i.base_price) * i.quantity).toFixed(2)}`
            ),
            DASHED_DIVIDER,
            `Subtotal: ₹${(receipt.final_total - receipt.gst_amount).toFixed(2)}`,
            `Savings: -₹${(receipt.savings_total || 0).toFixed(2)}`,
            `GST 5%: ₹${(receipt.gst_amount || 0).toFixed(2)}`,
            `FINAL TOTAL: ₹${(receipt.final_total || 0).toFixed(2)}`,
            DASHED_DIVIDER,
            "Thank you for shopping!",
        ];
        try {
            await Share.share({
                message: lines.join("\n"),
                title: "Receipt",
            });
        } catch (_) {}
    };

    const qrValue = JSON.stringify({ transaction_id, signature });
    const expired = timeLeftMs !== null && timeLeftMs <= 0;
    const lowTime = timeLeftMs !== null && timeLeftMs > 0 && timeLeftMs < 5 * 60 * 1000;

    return (
        <View style={styles.container}>
            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "exitqr" && styles.tabActive]}
                    onPress={() => setActiveTab("exitqr")}
                >
                    <Text style={[styles.tabText, activeTab === "exitqr" && styles.tabTextActive]}>
                        Exit QR
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "bill" && styles.tabActive]}
                    onPress={() => setActiveTab("bill")}
                >
                    <Text style={[styles.tabText, activeTab === "bill" && styles.tabTextActive]}>
                        Bill Details
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === "exitqr" && (
                <>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <Animated.View
                            style={[
                                styles.checkWrap,
                                { transform: [{ scale: scaleAnim }] },
                            ]}
                        >
                            <View style={styles.checkCircle}>
                                <MaterialIcons name="check" size={40} color={CHECK_GREEN} />
                            </View>
                        </Animated.View>

                        <Text style={styles.title}>Payment Successful</Text>
                        <Text style={styles.storeName}>{storeName}</Text>
                        <Text style={styles.txnId}>TXN ID: {transaction_id || "—"}</Text>

                        <Text style={styles.showAtGate}>
                            Please show this at the Exit Gate
                        </Text>
                        <Text style={styles.securityNote}>
                            Security will scan this QR code
                        </Text>

                        <View style={[styles.qrCardWrap, expired && styles.qrCardExpired]}>
                            <View style={[styles.qrCard, expired && styles.qrCardGrey]}>
                                {expired && (
                                    <View style={styles.qrExpiredOverlay}>
                                        <Text style={styles.qrExpiredText}>QR Expired</Text>
                                    </View>
                                )}
                                <View style={[styles.qrInner, expired && styles.qrInnerBlur]}>
                                    <QRCode
                                        value={qrValue}
                                        size={200}
                                        color={expired ? "#999" : "#000"}
                                        backgroundColor={CARD_BG}
                                    />
                                </View>
                            </View>
                        </View>

                        <Text style={styles.orderLabel}>Order ID</Text>
                        <Text style={styles.orderId}>{transaction_id || "—"}</Text>

                        <View style={styles.timerWrap}>
                            <Text
                                style={[
                                    styles.timerText,
                                    lowTime && styles.timerTextYellow,
                                    expired && styles.timerTextRed,
                                ]}
                            >
                                QR valid for{" "}
                                {timeLeftMs === null && !receipt?.expires_at
                                    ? "--:--"
                                    : formatTimeLeft(timeLeftMs ?? 0)}
                            </Text>
                            {expired && (
                                <Text style={styles.expiredMessage}>
                                    Please show your Bill Details to the guard
                                </Text>
                            )}
                        </View>

                        <View style={styles.bottomSpacer} />
                    </ScrollView>

                    <View style={styles.stickyBottom}>
                        <TouchableOpacity
                            style={styles.homeBtn}
                            onPress={handleBackToHome}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.homeBtnText}>Back to Home</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {activeTab === "bill" && (
                <>
                    <ScrollView
                        style={styles.billScroll}
                        contentContainerStyle={styles.billScrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {!receipt ? (
                            <Text style={styles.billLoading}>Loading receipt…</Text>
                        ) : (
                            <View style={styles.billCard}>
                                <Text style={styles.billStoreName}>
                                    {receipt.store_name || "Store"}
                                </Text>
                                <Text style={styles.billAddress}>123 Main Street</Text>
                                <View style={styles.billDivider} />

                                <View style={styles.billRow}>
                                    <Text style={styles.billLabel}>Order ID:</Text>
                                    <Text style={[styles.billValue, styles.mono]}>
                                        {receipt.transaction_id}
                                    </Text>
                                </View>
                                <View style={styles.billRow}>
                                    <Text style={styles.billLabel}>Date & Time:</Text>
                                    <Text style={styles.billValue}>
                                        {formatPaidAt(receipt.paid_at)}
                                    </Text>
                                </View>
                                <View style={styles.billRow}>
                                    <Text style={styles.billLabel}>Payment:</Text>
                                    <Text style={styles.billValue}>
                                        {receipt.payment_method || "UPI"}
                                    </Text>
                                </View>

                                <Text style={styles.billDashed}>{DASHED_DIVIDER}</Text>

                                <View style={styles.tableHeader}>
                                    <Text style={styles.tableHeaderItem}>Item</Text>
                                    <Text style={styles.tableHeaderQty}>Qty</Text>
                                    <Text style={styles.tableHeaderPrice}>Price</Text>
                                </View>
                                {(receipt.items || []).map((item, idx) => {
                                    const price =
                                        item.discounted_price ?? item.base_price ?? 0;
                                    const lineTotal = price * (item.quantity ?? 1);
                                    const hasDiscount =
                                        item.discounted_price != null &&
                                        item.discounted_price < (item.base_price ?? 0);
                                    return (
                                        <View
                                            key={idx}
                                            style={[
                                                styles.tableRow,
                                                idx % 2 === 1 && styles.tableRowAlt,
                                            ]}
                                        >
                                            <View style={styles.tableCellItem}>
                                                {hasDiscount && (
                                                    <Text style={styles.itemOriginal}>
                                                        ₹
                                                        {(
                                                            (item.base_price ?? 0) *
                                                            (item.quantity ?? 1)
                                                        ).toFixed(2)}
                                                    </Text>
                                                )}
                                                <Text style={styles.itemName}>
                                                    {item.name}
                                                    {item.brand ? ` (${item.brand})` : ""}
                                                </Text>
                                                {item.aisle ? (
                                                    <Text style={styles.itemAisle}>
                                                        Aisle {item.aisle}
                                                    </Text>
                                                ) : null}
                                            </View>
                                            <Text style={styles.tableCellQty}>
                                                {item.quantity ?? 1}
                                            </Text>
                                            <Text style={styles.tableCellPrice}>
                                                ₹{lineTotal.toFixed(2)}
                                            </Text>
                                        </View>
                                    );
                                })}

                                <Text style={styles.billDashed}>{DASHED_DIVIDER}</Text>

                                <View style={styles.totalsRow}>
                                    <Text style={styles.totalsLabel}>Subtotal</Text>
                                    <Text style={styles.totalsValue}>
                                        ₹
                                        {(
                                            (receipt.final_total || 0) -
                                            (receipt.gst_amount || 0)
                                        ).toFixed(2)}
                                    </Text>
                                </View>
                                {(receipt.savings_total || 0) > 0 && (
                                    <View style={styles.totalsRow}>
                                        <Text style={styles.totalsLabel}>Savings</Text>
                                        <Text style={styles.totalsSavings}>
                                            -₹{(receipt.savings_total || 0).toFixed(2)}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.totalsRow}>
                                    <Text style={styles.totalsLabel}>GST 5%</Text>
                                    <Text style={styles.totalsValue}>
                                        ₹{(receipt.gst_amount || 0).toFixed(2)}
                                    </Text>
                                </View>
                                <View style={[styles.totalsRow, styles.finalRow]}>
                                    <Text style={styles.finalLabel}>FINAL TOTAL</Text>
                                    <Text style={styles.finalValue}>
                                        ₹{(receipt.final_total || 0).toFixed(2)}
                                    </Text>
                                </View>

                                <View style={styles.billDivider} />

                                <View style={styles.billFooter}>
                                    <View style={styles.verifiedRow}>
                                        <MaterialIcons
                                            name="security"
                                            size={18}
                                            color={ACCENT}
                                        />
                                        <Text style={styles.verifiedText}>
                                            Verified by NoQueueBilling AI
                                        </Text>
                                    </View>
                                    <Text style={styles.thanksText}>
                                        Thank you for shopping!
                                    </Text>
                                    <View style={styles.smallQrWrap}>
                                        <QRCode
                                            value={receipt.transaction_id}
                                            size={80}
                                            color="#000"
                                            backgroundColor="#fff"
                                        />
                                    </View>
                                </View>
                            </View>
                        )}
                        <View style={styles.billBottomSpacer} />
                    </ScrollView>

                    <View style={styles.stickyBottom}>
                        <TouchableOpacity
                            style={styles.shareBtn}
                            onPress={handleShare}
                            activeOpacity={0.9}
                            disabled={!receipt}
                        >
                            <MaterialIcons name="share" size={22} color={WHITE} />
                            <Text style={styles.shareBtnText}>Share Receipt</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.homeBtnOutline}
                            onPress={handleBackToHome}
                        >
                            <Text style={styles.homeBtnOutlineText}>Back to Home</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    tabRow: {
        flexDirection: "row",
        paddingTop: 56,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: BG,
        gap: 8,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    tabActive: { backgroundColor: ACCENT },
    tabText: { fontSize: 15, fontWeight: "600", color: MUTED },
    tabTextActive: { color: WHITE },

    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
        alignItems: "center",
    },
    checkWrap: { marginBottom: 16 },
    checkCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(0, 255, 135, 0.2)",
        borderWidth: 3,
        borderColor: CHECK_GREEN,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: WHITE,
        marginBottom: 8,
    },
    storeName: { fontSize: 14, color: MUTED, marginBottom: 4 },
    txnId: { fontSize: 12, color: MONO, fontFamily: monoFont, marginBottom: 32 },
    showAtGate: {
        fontSize: 16,
        fontWeight: "700",
        color: WHITE,
        textAlign: "center",
        marginBottom: 6,
    },
    securityNote: { fontSize: 12, color: MUTED, marginBottom: 20 },
    qrCardWrap: {
        padding: 4,
        borderRadius: 24,
        backgroundColor: BORDER_GLOW,
        shadowColor: BORDER_GLOW,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 8,
    },
    qrCardExpired: { backgroundColor: "#666" },
    qrCard: {
        backgroundColor: CARD_BG,
        borderRadius: 20,
        padding: 20,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    qrCardGrey: { backgroundColor: "#E0E0E0", opacity: 0.9 },
    qrExpiredOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
    },
    qrExpiredText: {
        fontSize: 24,
        fontWeight: "700",
        color: EXPIRED_RED,
    },
    qrInner: { backgroundColor: CARD_BG, padding: 8, borderRadius: 12 },
    qrInnerBlur: { opacity: 0.6 },
    orderLabel: { fontSize: 11, color: MONO, marginTop: 20, textTransform: "uppercase" },
    orderId: { fontSize: 12, color: MONO, fontFamily: monoFont, marginTop: 4 },
    timerWrap: { marginTop: 16, alignItems: "center" },
    timerText: { fontSize: 16, fontWeight: "600", color: WHITE },
    timerTextYellow: { color: TIMER_YELLOW },
    timerTextRed: { color: EXPIRED_RED },
    expiredMessage: {
        fontSize: 13,
        color: MUTED,
        marginTop: 8,
        textAlign: "center",
    },
    bottomSpacer: { height: 100 },

    billScroll: { flex: 1 },
    billScrollContent: { padding: 16, paddingBottom: 24 },
    billLoading: { fontSize: 16, color: MUTED, textAlign: "center", marginTop: 24 },
    billCard: {
        backgroundColor: CARD_BG,
        borderRadius: 12,
        padding: 20,
    },
    billStoreName: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111",
        textAlign: "center",
    },
    billAddress: { fontSize: 12, color: MUTED, textAlign: "center", marginTop: 4 },
    billDivider: {
        height: 1,
        backgroundColor: "#E0E0E0",
        marginVertical: 12,
    },
    billRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    billLabel: { fontSize: 13, color: MUTED },
    billValue: { fontSize: 13, color: "#111" },
    mono: { fontFamily: monoFont },
    billDashed: { fontSize: 11, color: MUTED, textAlign: "center", marginVertical: 10 },
    tableHeader: {
        flexDirection: "row",
        marginBottom: 6,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: "#EEE",
    },
    tableHeaderItem: { flex: 1, fontSize: 11, textTransform: "uppercase", color: MUTED },
    tableHeaderQty: { width: 36, fontSize: 11, textTransform: "uppercase", color: MUTED, textAlign: "center" },
    tableHeaderPrice: { width: 70, fontSize: 11, textTransform: "uppercase", color: MUTED, textAlign: "right" },
    tableRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 10,
        paddingHorizontal: 4,
    },
    tableRowAlt: { backgroundColor: "#FAFAFA" },
    tableCellItem: { flex: 1, maxWidth: "50%" },
    itemOriginal: { fontSize: 10, color: "#BBB", textDecorationLine: "line-through", marginBottom: 2 },
    itemName: { fontSize: 13, color: "#111" },
    itemAisle: { fontSize: 10, color: "#BBB", marginTop: 2 },
    tableCellQty: { width: 36, fontSize: 13, color: "#111", textAlign: "center" },
    tableCellPrice: { width: 70, fontSize: 13, color: "#111", textAlign: "right" },
    totalsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
    totalsLabel: { fontSize: 13, color: "#111" },
    totalsValue: { fontSize: 13, color: "#111" },
    totalsSavings: { fontSize: 13, color: ACCENT, fontWeight: "600" },
    finalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 2, borderTopColor: "#111" },
    finalLabel: { fontSize: 16, fontWeight: "700", color: "#111" },
    finalValue: { fontSize: 16, fontWeight: "700", color: "#111" },
    billFooter: { alignItems: "center", marginTop: 16 },
    verifiedRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 8,
    },
    verifiedText: { fontSize: 13, fontWeight: "600", color: ACCENT },
    thanksText: { fontSize: 13, color: MUTED, marginBottom: 12 },
    smallQrWrap: { padding: 8, backgroundColor: "#fff", borderRadius: 8 },
    billBottomSpacer: { height: 120 },

    stickyBottom: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        paddingBottom: 40,
        backgroundColor: BG,
    },
    homeBtn: {
        backgroundColor: ACCENT,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    homeBtnText: { color: WHITE, fontSize: 17, fontWeight: "700" },
    shareBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: ACCENT,
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 10,
    },
    shareBtnText: { color: WHITE, fontSize: 17, fontWeight: "700" },
    homeBtnOutline: {
        paddingVertical: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: MUTED,
        borderRadius: 12,
    },
    homeBtnOutlineText: { fontSize: 15, fontWeight: "600", color: WHITE },
});
