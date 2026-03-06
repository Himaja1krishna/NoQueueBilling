import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    ActivityIndicator,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Provider } from "react-redux";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import store, { useAppSelector } from "./store";
import * as auth from "./services/auth";
import HomeScreen from "./screens/HomeScreen";
import ScannerScreen from "./screens/ScannerScreen";
import CartScreen from "./screens/CartScreen";
import OrdersScreen from "./screens/OrdersScreen";
import PaymentScreen from "./screens/PaymentScreen";
import ReceiptScreen from "./screens/ReceiptScreen";
import ChatbotScreen from "./screens/ChatbotScreen";
import AuthScreen from "./screens/AuthScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ACTIVE = "#00B14F";
const TAB_INACTIVE = "#BBBBBB";
const FAB_GREEN = "#00B14F";
const FAB_SIZE = 64;

function ScannerTabButton({ onPress }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.9}
            style={styles.fab}
        >
            <View style={styles.fabInner}>
                <MaterialIcons name="qr-code-scanner" size={28} color="#fff" />
            </View>
        </TouchableOpacity>
    );
}

function MainTabs() {
    const cartCount = useAppSelector((state) => state.cart.items.length);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: TAB_ACTIVE,
                tabBarInactiveTintColor: TAB_INACTIVE,
                tabBarStyle: styles.tabBar,
                tabBarShowLabel: true,
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <MaterialIcons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Offers"
                component={HomeScreen}
                initialParams={{ showOffers: true }}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <MaterialIcons name="local-offer" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Scanner"
                component={ScannerScreen}
                options={{
                    tabBarIcon: () => null,
                    tabBarButton: (props) => (
                        <View style={styles.fabContainer}>
                            <ScannerTabButton onPress={props.onPress} />
                        </View>
                    ),
                }}
            />
            <Tab.Screen
                name="Cart"
                component={CartScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <MaterialIcons name="shopping-bag" size={size} color={color} />
                    ),
                    tabBarBadge: cartCount > 0 ? cartCount : undefined,
                }}
            />
            <Tab.Screen
                name="MyOrders"
                component={OrdersScreen}
                options={{
                    tabBarLabel: "My Orders",
                    tabBarIcon: ({ color, size }) => (
                        <MaterialIcons name="person" size={size} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(null);

    useEffect(() => {
        if (!auth.isAuthConfigured()) {
            setIsLoggedIn(false);
            return;
        }
        auth
            .getCurrentUser()
            .then(() => setIsLoggedIn(true))
            .catch(() => setIsLoggedIn(false));
    }, []);

    if (isLoggedIn === null) {
        return (
            <Provider store={store}>
                <View style={styles.splash}>
                    <ActivityIndicator size="large" color="#00B14F" />
                    <Text style={styles.splashText}>Loading...</Text>
                </View>
            </Provider>
        );
    }

    return (
        <Provider store={store}>
            <NavigationContainer>
                <Stack.Navigator
                    initialRouteName="Auth"
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: "#fff" },
                    }}
                >
                    <Stack.Screen name="Auth" component={AuthScreen} />
                    <Stack.Screen name="MainTabs" component={MainTabs} />
                    <Stack.Screen name="Payment" component={PaymentScreen} />
                    <Stack.Screen name="Receipt" component={ReceiptScreen} />
                    <Stack.Screen name="Chatbot" component={ChatbotScreen} />
                </Stack.Navigator>
            </NavigationContainer>
        </Provider>
    );
}

const styles = StyleSheet.create({
    splash: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    splashText: {
        marginTop: 12,
        fontSize: 16,
        color: "#888888",
    },
    tabBar: {
        backgroundColor: "#fff",
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "#e0e0e0",
    },
    fabContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        marginTop: -FAB_SIZE / 2,
    },
    fab: {
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        backgroundColor: FAB_GREEN,
        alignItems: "center",
        justifyContent: "center",
        ...Platform.select({
            ios: {
                shadowColor: FAB_GREEN,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 6,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    fabInner: {
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        alignItems: "center",
        justifyContent: "center",
    },
});
