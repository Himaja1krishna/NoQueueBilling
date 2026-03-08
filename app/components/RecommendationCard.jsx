import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useAppSelector, useAppDispatch } from "../store";
import { addItem } from "../store/cartSlice";

const CARD_WIDTH = 300;
const CARD_HEIGHT = 340;
const IMAGE_HEIGHT = Math.round(CARD_HEIGHT * 0.55); // 55% of card
const GREEN = "#4CAF50";
const GREEN_DARK = "#43A047";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#1a1a1a";
const TEXT_MUTED = "#888888";
const TEXT_TAX = "#999999";

export default function RecommendationCard({ item, onPress }) {
    const dispatch = useAppDispatch();
    const selectedStore = useAppSelector((s) => s.user.selectedStore);

    const mrp = item.base_price ?? 0;
    const dmartPrice = item.discounted_price != null ? item.discounted_price : item.base_price ?? 0;
    const hasDiscount = item.discounted_price != null && item.discounted_price < (item.base_price ?? 0);
    const savings = hasDiscount ? Math.round((item.base_price ?? 0) - (item.discounted_price ?? 0)) : 0;

    const handleAdd = () => {
        dispatch(
            addItem({
                product_id: item.product_id,
                name: item.name,
                base_price: item.base_price ?? 0,
                discounted_price: item.discounted_price ?? null,
                aisle: item.aisle ?? "",
                store_id: selectedStore ?? "",
                image: item.image_url ?? item.image ?? null,
            })
        );
    };

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.95}
        >
            <View style={styles.imageWrap}>
                {(item.image_url || item.image) ? (
                    <Image
                        source={{ uri: item.image_url || item.image }}
                        style={styles.productImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.imagePlaceholder} />
                )}
                <View style={styles.vegBadge}>
                    <View style={styles.vegDot} />
                </View>
            </View>

            <Text style={styles.productName} numberOfLines={2}>
                {item.name}
            </Text>

            <Text style={styles.reasonText} numberOfLines={1}>
                {item.reason || "Recommended for you"}
            </Text>

            <View style={styles.pricingRow}>
                <View style={styles.pricingLeft}>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>MRP</Text>
                        <Text style={styles.strikePrice}>₹{mrp}</Text>
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>DMart</Text>
                        <Text style={styles.dmartPrice}>₹{dmartPrice}</Text>
                    </View>
                    <Text style={styles.taxText}>(Inclusive of all taxes)</Text>
                </View>
                {hasDiscount && savings > 0 && (
                    <View style={styles.savingsBadge}>
                        <Text style={styles.savingsAmount}>₹ {savings}</Text>
                        <Text style={styles.savingsOff}>OFF</Text>
                    </View>
                )}
            </View>

            <TouchableOpacity
                style={styles.addToCartBtn}
                onPress={(e) => {
                    e?.stopPropagation?.();
                    handleAdd();
                }}
                activeOpacity={0.85}
            >
                <MaterialIcons name="shopping-cart" size={18} color="#FFFFFF" />
                <Text style={styles.addToCartText}>ADD TO CART</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        minHeight: CARD_HEIGHT,
        marginRight: 20,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    imageWrap: {
        width: "100%",
        height: IMAGE_HEIGHT,
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        overflow: "hidden",
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
    },
    productImage: {
        width: "100%",
        height: "100%",
    },
    imagePlaceholder: {
        width: "100%",
        height: "100%",
        backgroundColor: "#F9FAFB",
    },
    vegBadge: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 16,
        height: 16,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: GREEN,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
    },
    vegDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: GREEN,
    },
    productName: {
        fontFamily: Platform.select({ ios: "System", android: "sans-serif-medium" }),
        fontSize: 15,
        fontWeight: "600",
        color: TEXT_PRIMARY,
        marginTop: 12,
    },
    reasonText: {
        fontSize: 13,
        color: "#666666",
        marginTop: 6,
        fontStyle: "italic",
    },
    pricingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 10,
    },
    pricingLeft: {
        flex: 1,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: 6,
    },
    priceLabel: {
        fontSize: 11,
        fontWeight: "400",
        color: TEXT_MUTED,
    },
    strikePrice: {
        fontSize: 13,
        fontWeight: "400",
        color: TEXT_MUTED,
        textDecorationLine: "line-through",
    },
    dmartPrice: {
        fontSize: 16,
        fontWeight: "700",
        color: TEXT_PRIMARY,
        marginTop: 2,
    },
    taxText: {
        fontSize: 10,
        fontStyle: "italic",
        color: TEXT_TAX,
        marginTop: 2,
    },
    savingsBadge: {
        backgroundColor: GREEN,
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 12,
    },
    savingsAmount: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    savingsOff: {
        fontSize: 12,
        fontWeight: "600",
        color: "#FFFFFF",
        marginTop: 0,
    },
    addToCartBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: "100%",
        height: 44,
        backgroundColor: GREEN,
        borderRadius: 6,
        marginTop: 12,
    },
    addToCartText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
        letterSpacing: 0.3,
    },
});
