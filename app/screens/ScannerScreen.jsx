import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Modal,
    ActivityIndicator,
    TextInput,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useAppSelector, useAppDispatch } from "../store";
import { addItem } from "../store/cartSlice";
import { getProduct } from "../services/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BRACKET_COLOR = "#FFE500";
const LASER_COLOR = "#00B14F";
const ACCENT = "#00B14F";
const BADGE_YELLOW = "#FFE500";
const TEXT = "#111111";
const MUTED = "#888888";
const BORDER = "#EBEBEB";

export default function ScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [product, setProduct] = useState(null);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [flashOn, setFlashOn] = useState(false);
    const [demoBarcode, setDemoBarcode] = useState("");
    const [lookupError, setLookupError] = useState("");
    const laserAnim = useRef(new Animated.Value(0)).current;

    const dispatch = useAppDispatch();
    const { total, items } = useAppSelector((s) => s.cart);
    const itemCount = items.reduce((c, i) => c + i.quantity, 0);
    const selectedStore = useAppSelector((s) => s.user.selectedStore);

    useEffect(() => {
        if (!permission?.granted) requestPermission();
    }, [permission]);

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(laserAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(laserAnim, {
                    toValue: 0,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [laserAnim]);

    const laserTranslate = laserAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-80, 80],
    });

    const handleBarCodeScanned = async ({ data }) => {
        if (scanned) return;
        await lookupByBarcode(data);
    };

    const lookupByBarcode = async (barcodeData) => {
        const trimmed = typeof barcodeData === "string" ? barcodeData.trim() : String(barcodeData || "").trim();
        if (!trimmed) return;
        setLookupError("");
        setScanned(true);
        setProcessing(true);
        try {
            await new Promise((r) => setTimeout(r, 200));
            const result = await getProduct(trimmed, selectedStore);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setProduct(result);
            setQuantity(1);
            setSheetVisible(true);
            setDemoBarcode("");
        } catch (err) {
            setScanned(false);
            setLookupError("Product not found. Try 8901030869944");
        } finally {
            setProcessing(false);
        }
    };

    const handleDemoLookup = () => {
        if (!demoBarcode.trim()) {
            setLookupError("Enter a barcode");
            return;
        }
        setLookupError("");
        lookupByBarcode(demoBarcode);
    };

    const closeSheet = () => {
        setSheetVisible(false);
        setProduct(null);
        setScanned(false);
    };

    const handleAddToCart = () => {
        if (!product) return;
        const p = {
            product_id: product.product_id,
            name: product.name,
            base_price: product.base_price ?? 0,
            discounted_price: product.discounted_price ?? null,
            aisle: product.aisle ?? "",
            store_id: product.store_id ?? "",
        };
        for (let i = 0; i < quantity; i++) dispatch(addItem(p));
        closeSheet();
    };

    const price = product?.discounted_price ?? product?.base_price ?? 0;
    const displayPrice = quantity * price;

    if (!permission?.granted) {
        return (
            <View style={styles.centered}>
                <Text style={styles.permissionText}>Camera permission is required to scan.</Text>
                <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                    <Text style={styles.permBtnText}>Grant Permission</Text>
                </TouchableOpacity>
                <View style={styles.demoStripStandalone}>
                    <Text style={styles.demoLabel}>Or demo with barcode</Text>
                    <View style={styles.demoRow}>
                        <TextInput
                            style={styles.demoInput}
                            placeholder="e.g. 8901030869944"
                            placeholderTextColor={MUTED}
                            value={demoBarcode}
                            onChangeText={(t) => {
                                setDemoBarcode(t);
                                setLookupError("");
                            }}
                            keyboardType="number-pad"
                            editable={!processing}
                        />
                        <TouchableOpacity
                            style={[styles.demoBtn, processing && styles.demoBtnDisabled]}
                            onPress={handleDemoLookup}
                            disabled={processing}
                        >
                            <Text style={styles.demoBtnText}>Look up</Text>
                        </TouchableOpacity>
                    </View>
                    {lookupError ? (
                        <Text style={styles.demoError}>{lookupError}</Text>
                    ) : (
                        <Text style={styles.demoHintStandalone}>Try: 8901030869944 (Amul), 8901060745678 (Parle-G)</Text>
                    )}
                </View>
                {processing && (
                    <View style={StyleSheet.absoluteFill}>
                        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
                    </View>
                )}
                <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={closeSheet}>
                    <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={closeSheet} />
                    <View style={styles.sheet}>
                        {product && (
                            <>
                                <Text style={styles.sheetName}>{product.name}</Text>
                                <Text style={styles.sheetBrand}>{product.brand}</Text>
                                <View style={styles.sheetRow}>
                                    <View style={styles.aisleBadge}>
                                        <Text style={styles.aisleText}>Aisle {product.aisle}</Text>
                                    </View>
                                    {product.is_on_sale && (
                                        <View style={styles.offBadge}>
                                            <Text style={styles.offBadgeText}>
                                                {product.discounted_price != null
                                                    ? `${Math.round((1 - product.discounted_price / product.base_price) * 100)}% OFF`
                                                    : "ON SALE"}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.priceRow}>
                                    {product.is_on_sale && product.base_price != null && (
                                        <Text style={styles.basePrice}>₹{product.base_price}</Text>
                                    )}
                                    <Text style={styles.discPrice}>₹{product?.discounted_price ?? product?.base_price ?? 0}</Text>
                                </View>
                                <View style={styles.quantityRow}>
                                    <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity((q) => Math.max(1, q - 1))}>
                                        <Text style={styles.qtyBtnText}>−</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.qtyNum}>{quantity}</Text>
                                    <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity((q) => q + 1)}>
                                        <Text style={styles.qtyBtnText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity style={styles.addBtn} onPress={handleAddToCart}>
                                    <Text style={styles.addBtnText}>Add to Cart · ₹{quantity * (product?.discounted_price ?? product?.base_price ?? 0)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.scanAgainBtn} onPress={closeSheet}>
                                    <Text style={styles.scanAgainText}>Look up another</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </Modal>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr", "ean13", "ean8", "upc_a"] }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                enableTorch={flashOn}
            />

            {/* Corner brackets overlay */}
            <View style={styles.overlay} pointerEvents="none">
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                <Animated.View
                    style={[
                        styles.laserLine,
                        { transform: [{ translateY: laserTranslate }] },
                    ]}
                />
            </View>

            {/* Flash toggle */}
            <TouchableOpacity
                style={styles.flashBtn}
                onPress={() => setFlashOn((v) => !v)}
            >
                <MaterialIcons
                    name={flashOn ? "flash-on" : "flash-off"}
                    size={26}
                    color="#fff"
                />
            </TouchableOpacity>

            {/* Cart pill */}
            <View style={styles.cartPill}>
                <Text style={styles.cartPillText}>
                    ₹{total} | {itemCount} items
                </Text>
            </View>

            {/* Demo: Enter barcode (hackathon) */}
            <View style={styles.demoStrip}>
                <Text style={styles.demoLabel}>Demo (no scanner)</Text>
                <View style={styles.demoRow}>
                    <TextInput
                        style={styles.demoInput}
                        placeholder="e.g. 8901030869944"
                        placeholderTextColor={MUTED}
                        value={demoBarcode}
                        onChangeText={(t) => {
                            setDemoBarcode(t);
                            setLookupError("");
                        }}
                        keyboardType="number-pad"
                        editable={!processing}
                    />
                    <TouchableOpacity
                        style={[styles.demoBtn, processing && styles.demoBtnDisabled]}
                        onPress={handleDemoLookup}
                        disabled={processing}
                    >
                        <Text style={styles.demoBtnText}>Look up</Text>
                    </TouchableOpacity>
                </View>
                {lookupError ? (
                    <Text style={styles.demoError}>{lookupError}</Text>
                ) : (
                    <Text style={styles.demoHint}>Try: 8901030869944 (Amul), 8901060745678 (Parle-G)</Text>
                )}
            </View>

            {/* Processing overlay */}
            {processing && (
                <View style={styles.processingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.processingText}>Processing...</Text>
                </View>
            )}

            {/* Bottom sheet */}
            <Modal
                visible={sheetVisible}
                transparent
                animationType="slide"
                onRequestClose={closeSheet}
            >
                <TouchableOpacity
                    style={styles.sheetBackdrop}
                    activeOpacity={1}
                    onPress={closeSheet}
                />
                <View style={styles.sheet}>
                    {product && (
                        <>
                            <Text style={styles.sheetName}>{product.name}</Text>
                            <Text style={styles.sheetBrand}>{product.brand}</Text>

                            <View style={styles.sheetRow}>
                                <View style={styles.aisleBadge}>
                                    <Text style={styles.aisleText}>Aisle {product.aisle}</Text>
                                </View>
                                {product.is_on_sale && (
                                    <View style={styles.offBadge}>
                                        <Text style={styles.offBadgeText}>
                                            {product.discounted_price != null
                                                ? `${Math.round(
                                                      (1 - product.discounted_price / product.base_price) * 100
                                                  )}% OFF`
                                                : "ON SALE"}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.priceRow}>
                                {product.is_on_sale && product.base_price != null && (
                                    <Text style={styles.basePrice}>₹{product.base_price}</Text>
                                )}
                                <Text style={styles.discPrice}>₹{price}</Text>
                            </View>

                            {product.coupon_eligible && (
                                <View style={styles.dealBadge}>
                                    <Text style={styles.dealBadgeText}>Deal Applied</Text>
                                </View>
                            )}

                            {product.ai_metadata?.frequently_bought_with?.length > 0 && (
                                <Text style={styles.freqText}>
                                    Often bought with{" "}
                                    {product.ai_metadata.frequently_bought_with.length === 1
                                        ? "1 related item"
                                        : `${product.ai_metadata.frequently_bought_with.length} related items`}
                                </Text>
                            )}

                            <View style={styles.quantityRow}>
                                <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                                >
                                    <Text style={styles.qtyBtnText}>−</Text>
                                </TouchableOpacity>
                                <Text style={styles.qtyNum}>{quantity}</Text>
                                <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => setQuantity((q) => q + 1)}
                                >
                                    <Text style={styles.qtyBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={styles.addBtn}
                                onPress={handleAddToCart}
                            >
                                <Text style={styles.addBtnText}>Add to Cart · ₹{displayPrice}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.scanAgainBtn} onPress={closeSheet}>
                                <Text style={styles.scanAgainText}>Scan Again</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </Modal>
        </View>
    );
}

const cornerSize = 40;
const cornerWidth = 4;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#111" },
    permissionText: { color: "#fff", fontSize: 16, marginBottom: 16 },
    permBtn: { backgroundColor: ACCENT, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    permBtnText: { color: "#fff", fontWeight: "600" },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
    },
    corner: {
        position: "absolute",
        width: cornerSize,
        height: cornerSize,
        borderColor: BRACKET_COLOR,
        borderWidth: cornerWidth,
    },
    topLeft: { top: SCREEN_HEIGHT / 2 - 100, left: SCREEN_WIDTH / 2 - 100, borderRightWidth: 0, borderBottomWidth: 0 },
    topRight: { top: SCREEN_HEIGHT / 2 - 100, left: SCREEN_WIDTH / 2 + 60, borderLeftWidth: 0, borderBottomWidth: 0 },
    bottomLeft: { top: SCREEN_HEIGHT / 2 + 60, left: SCREEN_WIDTH / 2 - 100, borderRightWidth: 0, borderTopWidth: 0 },
    bottomRight: { top: SCREEN_HEIGHT / 2 + 60, left: SCREEN_WIDTH / 2 + 60, borderLeftWidth: 0, borderTopWidth: 0 },
    laserLine: {
        position: "absolute",
        width: 200,
        height: 2,
        backgroundColor: LASER_COLOR,
    },
    flashBtn: {
        position: "absolute",
        top: 56,
        right: 20,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "rgba(255,255,255,0.3)",
        alignItems: "center",
        justifyContent: "center",
    },
    cartPill: {
        position: "absolute",
        top: 56,
        alignSelf: "center",
        backgroundColor: "rgba(255,255,255,0.9)",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    cartPillText: { fontSize: 14, fontWeight: "600", color: TEXT },
    demoStrip: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0,0,0,0.85)",
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    demoLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginBottom: 8 },
    demoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    demoInput: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: TEXT,
    },
    demoBtn: {
        backgroundColor: ACCENT,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 10,
    },
    demoBtnDisabled: { opacity: 0.6 },
    demoBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    demoHint: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 8 },
    demoError: { fontSize: 12, color: "#f87171", marginTop: 6 },
    demoStripStandalone: {
        marginTop: 24,
        width: "100%",
        maxWidth: 320,
        backgroundColor: "rgba(255,255,255,0.1)",
        padding: 16,
        borderRadius: 12,
    },
    demoHintStandalone: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 8 },
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.6)",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    processingText: { color: "#fff", fontSize: 16 },
    sheetBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    sheetName: { fontSize: 18, fontWeight: "700", color: TEXT },
    sheetBrand: { fontSize: 13, color: MUTED, marginTop: 4 },
    sheetRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
    aisleBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: ACCENT,
    },
    aisleText: { fontSize: 12, fontWeight: "600", color: ACCENT },
    offBadge: {
        backgroundColor: BADGE_YELLOW,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    offBadgeText: { fontSize: 11, fontWeight: "700", color: TEXT },
    priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
    basePrice: { fontSize: 16, color: MUTED, textDecorationLine: "line-through" },
    discPrice: { fontSize: 22, fontWeight: "700", color: ACCENT },
    dealBadge: {
        alignSelf: "flex-start",
        backgroundColor: ACCENT,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 8,
    },
    dealBadgeText: { fontSize: 12, fontWeight: "600", color: "#fff" },
    freqText: { fontSize: 13, color: MUTED, marginTop: 12, fontStyle: "italic" },
    quantityRow: { flexDirection: "row", alignItems: "center", marginTop: 16, gap: 16 },
    qtyBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: BORDER,
        alignItems: "center",
        justifyContent: "center",
    },
    qtyBtnText: { fontSize: 20, color: TEXT, fontWeight: "600" },
    qtyNum: { fontSize: 18, fontWeight: "600", color: TEXT, minWidth: 28, textAlign: "center" },
    addBtn: {
        backgroundColor: ACCENT,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 20,
    },
    addBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    scanAgainBtn: { alignItems: "center", marginTop: 12 },
    scanAgainText: { fontSize: 14, color: MUTED, fontWeight: "500" },
});
