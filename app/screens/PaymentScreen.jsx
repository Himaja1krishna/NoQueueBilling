import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Modal,
    Dimensions,
    Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useAppSelector } from "../store";
import { initiatePayment } from "../services/api";

// Lazily import native Razorpay only on mobile to avoid web crashes
let RazorpayCheckout = null;
if (Platform.OS !== "web") {
    RazorpayCheckout = require("react-native-razorpay").default;
}

function loadRazorpayWebScript() {
    return new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BORDER = "#EBEBEB";
const TEXT = "#111111";
const MUTED = "#888888";
const ACCENT = "#00B14F";
const RZP_BLUE = "#3395FF";
const INFO_BG = "#F0FBF4";
const ERROR_BG = "#FEF2F2";
const ERROR_TEXT = "#991B1B";
const H_PADDING = 16;

const PAYMENT_OPTIONS = [
    {
        id: "UPI",
        name: "UPI",
        subtitle: "Google Pay, PhonePe, Paytm",
        icon: "account-balance-wallet",
    },
    {
        id: "CARD",
        name: "Credit / Debit Card",
        subtitle: "Visa, Mastercard, RuPay",
        icon: "credit-card",
    },
    {
        id: "WALLET",
        name: "Wallets",
        subtitle: "Paytm, Amazon Pay, others",
        icon: "account-balance-wallet",
    },
];

export default function PaymentScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { finalTotal = 0, itemCount = 0, cartItems = [] } = route.params || {};

    const { userId, accountAgeDays, selectedStore } = useAppSelector((s) => s.user);

    const [state, setState] = useState("DEFAULT"); // DEFAULT | PROCESSING | FRAUD_BLOCKED
    const [selectedMethod, setSelectedMethod] = useState("UPI");

    const handlePay = async () => {
        setState("PROCESSING");
        try {
            const payload = {
                user_id: userId || "anonymous",
                cart_total: finalTotal,
                item_count: itemCount,
                account_age_days: accountAgeDays ?? 30,
                payment_method: selectedMethod,
                store_id: selectedStore || "STORE_001",
                items: Array.isArray(cartItems) ? cartItems : [],
            };
            const result = await initiatePayment(payload);

            if (result.fraud_outcome === "BLOCK") {
                setState("FRAUD_BLOCKED");
                return;
            }

            setState("DEFAULT");
            const keyId = process.env.EXPO_PUBLIC_RZP_KEY_ID || "rzp_test_xxx";
            const amountPaise = Math.round((result.amount || finalTotal) * 100);
            const options = {
                description: "NoQueue Billing",
                currency: "INR",
                key: keyId,
                amount: amountPaise,
                order_id: result.order_id,
                prefill: { email: "", contact: "", name: "" },
                theme: { color: RZP_BLUE },
            };

            if (Platform.OS === "web") {
                const loaded = await loadRazorpayWebScript();
                if (!loaded) {
                    setState("DEFAULT");
                    return;
                }
                const rzp = new window.Razorpay({
                    ...options,
                    handler: (data) => {
                        const paymentId = data.razorpay_payment_id || "";
                        const transaction_id = `TXN_${paymentId.replace("pay_", "")}`;
                        navigation.replace("Receipt", {
                            transaction_id,
                            signature: data.razorpay_signature || "",
                        });
                    },
                    modal: {
                        ondismiss: () => setState("DEFAULT"),
                    },
                });
                rzp.open();
            } else {
                RazorpayCheckout.open(options)
                    .then((data) => {
                        const paymentId = data.razorpay_payment_id || "";
                        const transaction_id = `TXN_${paymentId.replace("pay_", "")}`;
                        navigation.replace("Receipt", {
                            transaction_id,
                            signature: data.razorpay_signature || "",
                        });
                    })
                    .catch((err) => {
                        if (err.code !== 2) {
                            setState("DEFAULT");
                        }
                    });
            }
        } catch (err) {
            const msg = err?.message || "";
            if (msg.includes("blocked") || msg.includes("403")) {
                setState("FRAUD_BLOCKED");
            } else {
                setState("DEFAULT");
            }
        }
    };

    const handleBackToCart = () => {
        setState("DEFAULT");
        navigation.goBack();
    };

    const goBack = () => navigation.goBack();

    return (
        <View style={styles.container}>
            {/* STATE 1 — DEFAULT */}
            {state === "DEFAULT" && (
                <>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                            <MaterialIcons name="arrow-back" size={24} color={TEXT} />
                        </TouchableOpacity>
                        <View style={styles.secured}>
                            <MaterialIcons name="security" size={18} color={MUTED} />
                            <Text style={styles.securedText}>Secured by Razorpay</Text>
                        </View>
                    </View>

                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.amountBlock}>
                            <Text style={styles.amountLabel}>Amount to Pay</Text>
                            <Text style={styles.amountValue}>₹{finalTotal}</Text>
                        </View>

                        <Text style={styles.sectionTitle}>Choose Payment Method</Text>
                        <View style={styles.optionsCard}>
                            {PAYMENT_OPTIONS.map((opt, idx) => {
                                const isSelected = selectedMethod === opt.id;
                                return (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[
                                            styles.optionRow,
                                            idx > 0 && styles.optionRowBorder,
                                            isSelected && styles.optionRowSelected,
                                        ]}
                                        onPress={() => setSelectedMethod(opt.id)}
                                        activeOpacity={0.7}
                                    >
                                        <MaterialIcons
                                            name={opt.icon}
                                            size={24}
                                            color={isSelected ? RZP_BLUE : MUTED}
                                        />
                                        <View style={styles.optionText}>
                                            <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>
                                                {opt.name}
                                            </Text>
                                            <Text style={styles.optionSub}>{opt.subtitle}</Text>
                                        </View>
                                        <MaterialIcons
                                            name={isSelected ? "radio-button-checked" : "radio-button-unchecked"}
                                            size={22}
                                            color={isSelected ? RZP_BLUE : MUTED}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.infoCard}>
                            <MaterialIcons name="lock" size={20} color={ACCENT} />
                            <Text style={styles.infoText}>
                                Your payment is secure and encrypted.
                            </Text>
                        </View>

                        <View style={styles.bottomSpacer} />
                    </ScrollView>

                    <View style={styles.stickyBottom}>
                        <TouchableOpacity
                            style={styles.payBtn}
                            onPress={handlePay}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.payBtnText}>Pay ₹{finalTotal}</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {/* STATE 2 — PROCESSING */}
            <Modal visible={state === "PROCESSING"} transparent>
                <View style={styles.overlay}>
                    <View style={styles.overlayBlur} />
                    <View style={styles.processingBox}>
                        <ActivityIndicator size="large" color={RZP_BLUE} />
                        <Text style={styles.processingTitle}>
                            AI Security Check in progress...
                        </Text>
                        <Text style={styles.processingSub}>
                            Verifying with Amazon Fraud Detector
                        </Text>
                    </View>
                </View>
            </Modal>

            {/* STATE 3 — FRAUD BLOCKED */}
            {state === "FRAUD_BLOCKED" && (
                <View style={styles.fraudContainer}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleBackToCart} style={styles.backBtn}>
                            <MaterialIcons name="arrow-back" size={24} color={TEXT} />
                        </TouchableOpacity>
                        <View style={styles.secured}>
                            <MaterialIcons name="security" size={18} color={MUTED} />
                            <Text style={styles.securedText}>Secured by Razorpay</Text>
                        </View>
                    </View>
                    <View style={styles.fraudCard}>
                        <MaterialIcons name="security" size={40} color={ERROR_TEXT} />
                        <Text style={styles.fraudTitle}>
                            Transaction Flagged for Review
                        </Text>
                        <Text style={styles.fraudSub}>
                            Please see a store associate at checkout counter
                        </Text>
                        <TouchableOpacity
                            style={styles.backToCartBtn}
                            onPress={handleBackToCart}
                        >
                            <Text style={styles.backToCartText}>Back to Cart</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F7F7F7" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: H_PADDING,
        paddingTop: 56,
        paddingBottom: 16,
        backgroundColor: "#fff",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: BORDER,
    },
    backBtn: { padding: 4 },
    secured: { flexDirection: "row", alignItems: "center", gap: 6 },
    securedText: { fontSize: 13, color: MUTED },
    scroll: { flex: 1 },
    scrollContent: { padding: H_PADDING, paddingBottom: 24 },
    amountBlock: { alignItems: "center", paddingVertical: 24 },
    amountLabel: { fontSize: 14, color: MUTED, marginBottom: 4 },
    amountValue: { fontSize: 32, fontWeight: "700", color: TEXT },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: TEXT,
        marginBottom: 12,
    },
    optionsCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BORDER,
        overflow: "hidden",
    },
    optionRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        gap: 12,
    },
    optionRowBorder: { borderTopWidth: 1, borderTopColor: BORDER },
    optionRowSelected: { backgroundColor: "#EEF5FF" },
    optionText: { flex: 1 },
    optionName: { fontSize: 15, fontWeight: "600", color: TEXT },
    optionNameSelected: { color: RZP_BLUE },
    optionSub: { fontSize: 12, color: MUTED, marginTop: 2 },
    infoCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: INFO_BG,
        padding: 14,
        borderRadius: 12,
        marginTop: 24,
        gap: 10,
        borderWidth: 1,
        borderColor: "rgba(0, 177, 79, 0.2)",
    },
    infoText: { fontSize: 13, color: TEXT, flex: 1 },
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
        backgroundColor: RZP_BLUE,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    payBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
    overlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    overlayBlur: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    processingBox: {
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 32,
        borderRadius: 16,
        marginHorizontal: 24,
        minWidth: 280,
    },
    processingTitle: { fontSize: 16, fontWeight: "600", color: TEXT, marginTop: 16 },
    processingSub: { fontSize: 13, color: MUTED, marginTop: 8 },
    fraudContainer: { flex: 1, backgroundColor: "#F7F7F7" },
    fraudCard: {
        margin: H_PADDING,
        marginTop: 24,
        backgroundColor: ERROR_BG,
        borderRadius: 12,
        padding: 24,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(153, 27, 27, 0.3)",
    },
    fraudTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: ERROR_TEXT,
        marginTop: 12,
        textAlign: "center",
    },
    fraudSub: {
        fontSize: 14,
        color: MUTED,
        marginTop: 8,
        textAlign: "center",
    },
    backToCartBtn: {
        marginTop: 20,
        paddingVertical: 14,
        paddingHorizontal: 24,
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: BORDER,
    },
    backToCartText: { fontSize: 15, fontWeight: "600", color: TEXT },
});
