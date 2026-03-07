import React from "react";
import { View, StyleSheet } from "react-native";
import { useZxing } from "react-zxing";

/**
 * Web-only barcode scanner using camera stream (getUserMedia).
 * Rendered only when Platform.OS === 'web'. Use for demo camera scanning on web and mobile browsers.
 */
export default function WebBarcodeScanner({ onScan, onError, paused }) {
    const { ref } = useZxing({
        onDecodeResult(result) {
            if (result && result.getText) onScan(result.getText());
        },
        onError(err) {
            if (onError) onError(err);
        },
        paused: !!paused,
        constraints: { video: { facingMode: "environment" }, audio: false },
        timeBetweenDecodingAttempts: 400,
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
