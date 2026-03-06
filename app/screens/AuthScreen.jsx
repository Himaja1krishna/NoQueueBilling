import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useDispatch } from "react-redux";

import * as auth from "../services/auth";
import { setUser } from "../store/userSlice";

const ACCENT = "#00B14F";
const BORDER = "#EBEBEB";
const TEXT = "#111111";
const MUTED = "#888888";
const ERROR_TEXT = "#991B1B";

function calculateDaysSinceSignup(createdAt) {
    if (!createdAt) return 0;
    const t =
        typeof createdAt === "number"
            ? createdAt
            : new Date(createdAt).getTime();
    return Math.max(
        0,
        Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000))
    );
}

export default function AuthScreen() {
    const navigation = useNavigation();
    const dispatch = useDispatch();

    const [tab, setTab] = useState("login"); // 'login' | 'signup'
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [signUpSuccess, setSignUpSuccess] = useState(false);
    const [pendingSignUp, setPendingSignUp] = useState(null); // { email, password, name }
    const [checkingSession, setCheckingSession] = useState(true);

    // If already logged in (e.g. returning user), go to MainTabs (Auth first, then redirect)
    useEffect(() => {
        if (!auth.isAuthConfigured()) {
            setCheckingSession(false);
            return;
        }
        auth
            .getCurrentUser()
            .then((user) => {
                dispatch(
                    setUser({
                        userId: user.userId,
                        name: user.name,
                        accountAgeDays: calculateDaysSinceSignup(user.createdAt),
                    })
                );
                navigation.replace("MainTabs");
            })
            .catch(() => setCheckingSession(false));
    }, [dispatch, navigation]);

    const handleLogin = async () => {
        setError("");
        if (!email.trim() || !password) {
            setError("Please enter email and password.");
            return;
        }
        setLoading(true);
        try {
            await auth.signIn(email.trim(), password);
            const user = await auth.getCurrentUser();
            dispatch(
                setUser({
                    userId: user.userId,
                    name: user.name,
                    accountAgeDays: calculateDaysSinceSignup(user.createdAt),
                })
            );
            navigation.replace("MainTabs");
        } catch (err) {
            const msg =
                err?.message || err?.name || "Login failed. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async () => {
        setError("");
        if (!name.trim() || !email.trim() || !password) {
            setError("Please fill in name, email, and password.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        setLoading(true);
        try {
            await auth.signUp(email.trim(), password, name.trim());
            setSignUpSuccess(true);
            setPendingSignUp({
                email: email.trim(),
                password,
                name: name.trim(),
            });
            setCode("");
            setError("");
        } catch (err) {
            const msg =
                err?.message || err?.name || "Sign up failed. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!pendingSignUp || !code.trim()) {
            setError("Please enter the verification code from your email.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            await auth.confirmSignUp(pendingSignUp.email, code.trim());
            await auth.signIn(pendingSignUp.email, pendingSignUp.password);
            const user = await auth.getCurrentUser();
            dispatch(
                setUser({
                    userId: user.userId,
                    name: user.name,
                    accountAgeDays: 0,
                })
            );
            setPendingSignUp(null);
            setSignUpSuccess(false);
            navigation.replace("MainTabs");
        } catch (err) {
            const msg =
                err?.message ||
                err?.name ||
                "Verification failed. Please check the code and try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = [styles.input, styles.inputBorder];
    const labelStyle = styles.label;

    if (checkingSession) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color={ACCENT} />
                <Text style={[styles.label, { marginTop: 12 }]}>Checking session...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.logo}>NoQueueBilling</Text>

                {!auth.isAuthConfigured() && (
                    <View style={styles.configBox}>
                        <Text style={styles.configTitle}>
                            Auth User Pool not configured
                        </Text>
                        <Text style={styles.configText}>
                            Add EXPO_PUBLIC_USER_POOL_ID and
                            EXPO_PUBLIC_USER_POOL_CLIENT_ID to your app .env (in
                            the app folder), then restart the app.
                        </Text>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnGreen, { marginTop: 12 }]}
                            onPress={() => {
                                dispatch(
                                    setUser({
                                        userId: "guest",
                                        name: "Guest",
                                        accountAgeDays: 0,
                                    })
                                );
                                navigation.replace("MainTabs");
                            }}
                        >
                            <Text style={styles.btnText}>Continue as guest</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {auth.isAuthConfigured() && (
                    <>
                {/* Tabs */}
                <View style={styles.tabRow}>
                    <TouchableOpacity
                        style={[styles.tab, tab === "login" && styles.tabActive]}
                        onPress={() => {
                            setTab("login");
                            setError("");
                        }}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                tab === "login" && styles.tabTextActive,
                            ]}
                        >
                            Login
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            tab === "signup" && styles.tabActive,
                        ]}
                        onPress={() => {
                            setTab("signup");
                            setError("");
                            setSignUpSuccess(false);
                            setPendingSignUp(null);
                        }}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                tab === "signup" && styles.tabTextActive,
                            ]}
                        >
                            Sign Up
                        </Text>
                    </TouchableOpacity>
                </View>

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {tab === "login" && !signUpSuccess && (
                    <>
                        <Text style={labelStyle}>Email</Text>
                        <TextInput
                            style={inputStyle}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="you@example.com"
                            placeholderTextColor={MUTED}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!loading}
                        />
                        <Text style={[labelStyle, { marginTop: 12 }]}>
                            Password
                        </Text>
                        <TextInput
                            style={inputStyle}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Password"
                            placeholderTextColor={MUTED}
                            secureTextEntry
                            editable={!loading}
                        />
                        <TouchableOpacity
                            style={[styles.btn, styles.btnGreen]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.btnText}>Login</Text>
                            )}
                        </TouchableOpacity>
                    </>
                )}

                {tab === "signup" && !signUpSuccess && (
                    <>
                        <Text style={labelStyle}>Name</Text>
                        <TextInput
                            style={inputStyle}
                            value={name}
                            onChangeText={setName}
                            placeholder="Your name"
                            placeholderTextColor={MUTED}
                            editable={!loading}
                        />
                        <Text style={[labelStyle, { marginTop: 12 }]}>
                            Email
                        </Text>
                        <TextInput
                            style={inputStyle}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="you@example.com"
                            placeholderTextColor={MUTED}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!loading}
                        />
                        <Text style={[labelStyle, { marginTop: 12 }]}>
                            Password
                        </Text>
                        <TextInput
                            style={inputStyle}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="At least 8 characters"
                            placeholderTextColor={MUTED}
                            secureTextEntry
                            editable={!loading}
                        />
                        <TouchableOpacity
                            style={[styles.btn, styles.btnGreen]}
                            onPress={handleSignUp}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.btnText}>
                                    Create Account
                                </Text>
                            )}
                        </TouchableOpacity>
                    </>
                )}

                {signUpSuccess && pendingSignUp && (
                    <>
                        <View style={styles.successBox}>
                            <Text style={styles.successText}>
                                Check your email for the verification code.
                            </Text>
                        </View>
                        <Text style={labelStyle}>Verification code</Text>
                        <TextInput
                            style={inputStyle}
                            value={code}
                            onChangeText={setCode}
                            placeholder="Enter code from email"
                            placeholderTextColor={MUTED}
                            keyboardType="number-pad"
                            editable={!loading}
                        />
                        <TouchableOpacity
                            style={[styles.btn, styles.btnGreen]}
                            onPress={handleVerify}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.btnText}>Verify</Text>
                            )}
                        </TouchableOpacity>
                    </>
                )}

                <View style={styles.bottomSpacer} />
                    </>
                )}

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 80,
        paddingBottom: 24,
    },
    logo: {
        fontSize: 24,
        fontWeight: "700",
        color: TEXT,
        textAlign: "center",
        marginBottom: 32,
    },
    tabRow: {
        flexDirection: "row",
        marginBottom: 24,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: BORDER,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: ACCENT,
    },
    tabText: {
        fontSize: 16,
        color: MUTED,
    },
    tabTextActive: {
        color: ACCENT,
        fontWeight: "600",
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
        color: TEXT,
        marginBottom: 6,
    },
    input: {
        height: 48,
        borderRadius: 10,
        paddingHorizontal: 14,
        fontSize: 16,
        color: TEXT,
        backgroundColor: "#fff",
    },
    inputBorder: {
        borderWidth: 1,
        borderColor: BORDER,
    },
    btn: {
        height: 52,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 24,
    },
    btnGreen: {
        backgroundColor: ACCENT,
    },
    btnText: {
        fontSize: 17,
        fontWeight: "700",
        color: "#fff",
    },
    errorBox: {
        backgroundColor: "#FEF2F2",
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(153, 27, 27, 0.2)",
    },
    errorText: {
        fontSize: 14,
        color: ERROR_TEXT,
    },
    successBox: {
        backgroundColor: "#F0FBF4",
        padding: 12,
        borderRadius: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "rgba(0, 177, 79, 0.2)",
    },
    successText: {
        fontSize: 14,
        color: TEXT,
    },
    configBox: {
        backgroundColor: "#F5F5F5",
        padding: 16,
        borderRadius: 10,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: BORDER,
    },
    configTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: TEXT,
        marginBottom: 8,
    },
    configText: {
        fontSize: 13,
        color: MUTED,
        lineHeight: 20,
    },
    bottomSpacer: { height: 40 },
});
