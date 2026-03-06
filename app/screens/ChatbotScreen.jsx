import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    Animated,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useAppSelector } from "../store";
import { sendChatMessage } from "../services/api";

const ACCENT = "#00B14F";
const TEXT = "#111111";
const MUTED = "#888888";
const BORDER = "#EBEBEB";
const H_PADDING = 16;

const PROMPT_CHIPS = [
    "Where is the organic honey? 🍯",
    "Do I have enough points? ⭐",
    "What's on offer today? 🏷️",
];

function LiveDot() {
    const opacity = useRef(new Animated.Value(0.6)).current;
    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, [opacity]);
    return <Animated.View style={[styles.pulseDot, { opacity }]} />;
}

function TypingDots() {
    const dot0 = useRef(new Animated.Value(0)).current;
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dots = [dot0, dot1, dot2];

    useEffect(() => {
        const anims = dots.map((dot, i) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ]),
                { delay: i * 150 }
            )
        );
        anims.forEach((a) => a.start());
        return () => anims.forEach((a) => a.stop());
    }, []);

    return (
        <View style={styles.typingWrap}>
            {dots.map((dot, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.typingDot,
                        {
                            opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                        },
                    ]}
                />
            ))}
        </View>
    );
}

export default function ChatbotScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const prefill = route.params?.prefill;
    const selectedStore = useAppSelector((s) => s.user.selectedStore);

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const listRef = useRef(null);

    useEffect(() => {
        if (prefill && typeof prefill === "string") {
            setInput(prefill);
        }
    }, [prefill]);

    useEffect(() => {
        if (messages.length > 0 && listRef.current) {
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    const handleSend = async (text) => {
        const msg = (text || input).trim();
        if (!msg || sending) return;

        setInput("");
        const userMsg = { id: Date.now().toString(), role: "user", text: msg };
        setMessages((prev) => [...prev, userMsg]);
        setSending(true);

        const typingId = `typing-${Date.now()}`;
        setMessages((prev) => [...prev, { id: typingId, typing: true }]);

        try {
            const res = await sendChatMessage(msg, selectedStore || "");
            const reply = res?.reply ?? "Sorry, I couldn't get a response.";
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === typingId
                        ? { id: typingId, role: "assistant", text: reply }
                        : m
                )
            );
        } catch (err) {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === typingId
                        ? { id: typingId, role: "assistant", text: "Something went wrong. Please try again." }
                        : m
                )
            );
        } finally {
            setSending(false);
        }
    };

    const handleChipPress = (chip) => {
        handleSend(chip);
    };

    const renderItem = ({ item }) => {
        if (item.typing) {
            return (
                <View style={styles.msgRowLeft}>
                    <View style={styles.bubbleAi}>
                        <TypingDots />
                    </View>
                </View>
            );
        }
        if (item.role === "user") {
            return (
                <View style={styles.msgRowRight}>
                    <View style={styles.bubbleUser}>
                        <Text style={styles.msgTextUser}>{item.text}</Text>
                    </View>
                </View>
            );
        }
        return (
            <View style={styles.msgRowLeft}>
                <View style={styles.bubbleAi}>
                    <Text style={styles.msgTextAi}>{item.text}</Text>
                </View>
            </View>
        );
    };

    const renderListEmpty = () => (
        <View style={styles.chipsWrap}>
            {PROMPT_CHIPS.map((chip, i) => (
                <TouchableOpacity
                    key={i}
                    style={styles.chip}
                    onPress={() => handleChipPress(chip)}
                    disabled={sending}
                >
                    <Text style={styles.chipText}>{chip}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color={TEXT} />
                </TouchableOpacity>
                <Text style={styles.title}>AI Assistant</Text>
                <View style={styles.liveWrap}>
                    <LiveDot />
                </View>
            </View>

            <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={[
                    styles.listContent,
                    messages.length === 0 && styles.listContentEmpty,
                ]}
                ListEmptyComponent={renderListEmpty}
            />

            <View style={styles.inputBar}>
                <TextInput
                    style={styles.input}
                    placeholder="Ask about products, offers..."
                    placeholderTextColor={MUTED}
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={() => handleSend()}
                    returnKeyType="send"
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
                    onPress={() => handleSend()}
                    disabled={!input.trim() || sending}
                >
                    <MaterialIcons name="send" size={22} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F7F7F7" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: H_PADDING,
        paddingTop: 56,
        paddingBottom: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    backBtn: { padding: 4, marginRight: 8 },
    title: { flex: 1, fontSize: 18, fontWeight: "700", color: TEXT },
    liveWrap: { padding: 4 },
    pulseDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: ACCENT,
        opacity: 0.9,
    },
    listContent: { padding: H_PADDING, paddingBottom: 24 },
    listContentEmpty: { flexGrow: 1, justifyContent: "center" },
    chipsWrap: { alignItems: "center", gap: 12 },
    chip: {
        backgroundColor: "#fff",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: BORDER,
        maxWidth: "90%",
    },
    chipText: { fontSize: 14, color: TEXT },
    msgRowRight: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 12 },
    msgRowLeft: { flexDirection: "row", justifyContent: "flex-start", marginBottom: 12 },
    bubbleUser: {
        backgroundColor: ACCENT,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        maxWidth: "85%",
    },
    msgTextUser: { fontSize: 14, color: "#fff" },
    bubbleAi: {
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BORDER,
        maxWidth: "85%",
    },
    msgTextAi: { fontSize: 14, color: TEXT },
    typingWrap: { flexDirection: "row", gap: 4, paddingVertical: 4 },
    typingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: MUTED,
    },
    inputBar: {
        flexDirection: "row",
        alignItems: "flex-end",
        padding: H_PADDING,
        paddingBottom: 28,
        backgroundColor: "#fff",
        borderTopWidth: 1,
        borderTopColor: BORDER,
        gap: 10,
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 100,
        backgroundColor: "#F5F5F5",
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: TEXT,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: ACCENT,
        alignItems: "center",
        justifyContent: "center",
    },
    sendBtnDisabled: { opacity: 0.5 },
});
