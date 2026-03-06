import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useAppDispatch } from "../store";
import { addItem, removeItem, removeItemEntirely } from "../store/cartSlice";

const TEXT = "#111111";
const BORDER = "#EBEBEB";
const ACCENT = "#00B14F";
const AISLE = "#BBBBBB";
const PLACEHOLDER = "#F3F3F3";

export default function CartItem({ item }) {
    const dispatch = useAppDispatch();
    const {
        product_id,
        name,
        base_price,
        discounted_price,
        quantity,
        aisle,
        image,
        store_id,
    } = item;
    const displayPrice = discounted_price ?? base_price ?? 0;

    const handleMinus = () => dispatch(removeItem(product_id));
    const handlePlus = () =>
        dispatch(
            addItem({
                product_id,
                name,
                base_price: base_price ?? 0,
                discounted_price: discounted_price ?? null,
                aisle: aisle ?? "",
                store_id: store_id ?? "",
            })
        );
    const handleTrash = () => dispatch(removeItemEntirely(product_id));

    const hasDiscount = discounted_price != null && discounted_price !== base_price;

    return (
        <View style={styles.card}>
            <View style={styles.imageWrap}>
                {image ? (
                    <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
                ) : (
                    <View style={styles.placeholder} />
                )}
            </View>
            <View style={styles.center}>
                <Text style={styles.name} numberOfLines={2}>
                    {name}
                </Text>
                <View style={styles.priceRow}>
                    {hasDiscount && (
                        <Text style={styles.basePrice}>₹{base_price}</Text>
                    )}
                    <Text style={[styles.discPrice, hasDiscount && styles.discPriceGreen]}>
                        ₹{displayPrice}
                    </Text>
                </View>
                <Text style={styles.aisle}>Aisle {aisle || "—"}</Text>
            </View>
            <View style={styles.right}>
                <View style={styles.qtyRow}>
                    <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={handleMinus}
                        disabled={quantity <= 1}
                    >
                        <MaterialIcons
                            name="remove"
                            size={18}
                            color={quantity <= 1 ? AISLE : TEXT}
                        />
                    </TouchableOpacity>
                    <Text style={styles.qtyNum}>{quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={handlePlus}>
                        <MaterialIcons name="add" size={18} color={TEXT} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.trashBtn} onPress={handleTrash}>
                    <MaterialIcons name="delete-outline" size={20} color={AISLE} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 12,
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 8,
    },
    imageWrap: {
        width: 64,
        height: 64,
        borderRadius: 8,
        overflow: "hidden",
        marginRight: 12,
    },
    image: {
        width: "100%",
        height: "100%",
    },
    placeholder: {
        width: "100%",
        height: "100%",
        backgroundColor: PLACEHOLDER,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        minWidth: 0,
    },
    name: {
        fontSize: 14,
        fontWeight: "600",
        color: TEXT,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 2,
    },
    basePrice: {
        fontSize: 13,
        color: AISLE,
        textDecorationLine: "line-through",
    },
    discPrice: {
        fontSize: 13,
        fontWeight: "600",
        color: TEXT,
    },
    discPriceGreen: {
        color: ACCENT,
    },
    aisle: {
        fontSize: 11,
        color: AISLE,
        marginTop: 2,
    },
    right: {
        alignItems: "center",
        marginLeft: 8,
    },
    qtyRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    qtyBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: BORDER,
        alignItems: "center",
        justifyContent: "center",
    },
    qtyNum: {
        fontSize: 14,
        fontWeight: "600",
        color: TEXT,
        minWidth: 20,
        textAlign: "center",
    },
    trashBtn: {
        marginTop: 8,
        padding: 4,
    },
});
