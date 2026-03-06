import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

const BADGE = "#FFE500";
const CARD_BG = "#FFFFFF";
const TEXT = "#111111";
const DESC = "#888888";
const EXPIRY = "#BBBBBB";
const BORDER = "#EBEBEB";

function formatExpiry(validUntil) {
    if (!validUntil) return "";
    const date = new Date(validUntil);
    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function OfferBanner({ offer, onPress }) {
    const {
        title,
        description,
        discount_pct,
        discount_flat,
        valid_until,
    } = offer || {};

    const discountLabel =
        discount_flat != null
            ? `₹${discount_flat} OFF`
            : `${discount_pct ?? 0}% OFF`;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <View style={styles.topRow}>
                <Text style={styles.title} numberOfLines={1}>
                    {title}
                </Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{discountLabel}</Text>
                </View>
            </View>
            {description ? (
                <Text style={styles.desc} numberOfLines={2}>
                    {description}
                </Text>
            ) : null}
            {valid_until ? (
                <Text style={styles.expiry}>{formatExpiry(valid_until)}</Text>
            ) : null}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        width: 200,
        height: 100,
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 12,
        padding: 10,
        marginRight: 12,
        justifyContent: "space-between",
    },
    topRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    title: {
        flex: 1,
        fontSize: 13,
        fontWeight: "600",
        color: TEXT,
    },
    badge: {
        backgroundColor: BADGE,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "700",
        color: TEXT,
    },
    desc: {
        fontSize: 11,
        color: DESC,
    },
    expiry: {
        fontSize: 11,
        color: EXPIRY,
    },
});
