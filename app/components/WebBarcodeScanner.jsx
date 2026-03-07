import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useZxing } from "react-zxing";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";

// Formats to scan:
// - EAN_13 / EAN_8 / UPC_A / UPC_E  → standard retail barcodes
// - CODE_128                          → GS1-128 (encodes EAN-14 as 14-digit AI barcode)
// - ITF                               → ITF-14 (the other EAN-14 carrier)
// - QR_CODE                           → QR support
const SCAN_FORMATS = [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.ITF,
    BarcodeFormat.QR_CODE,
];

/**
 * Web-only barcode scanner using camera stream (getUserMedia).
 * Rendered only when Platform.OS === 'web'. Use for demo camera scanning on web and mobile browsers.
 */
export default function WebBarcodeScanner({ onScan, onError, paused }) {
    const hints = useMemo(() => {
        const map = new Map();
        map.set(DecodeHintType.POSSIBLE_FORMATS, SCAN_FORMATS);
        map.set(DecodeHintType.TRY_HARDER, true);
        return map;
    }, []);

    const { ref } = useZxing({
        onDecodeResult(result) {
            if (result && result.getText) onScan(result.getText());
        },
        onError(err) {
            if (onError) onError(err);
        },
        paused: !!paused,
        hints,
        constraints: { video: { facingMode: "environment" }, audio: false },
        timeBetweenDecodingAttempts: 300,
    });

    return (
        <View style={StyleSheet.absoluteFill}>
            <video
                ref={ref}
                style={videoStyle}
                playsInline
                muted
                autoPlay
            />
        </View>
    );
}

const videoStyle = {
    position: "absolute",
    width: "100%",
    height: "100%",
    objectFit: "cover",
};
