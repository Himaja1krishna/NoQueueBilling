import { Amplify } from "aws-amplify";
import {
    signIn as amplifySignIn,
    signUp as amplifySignUp,
    confirmSignUp as amplifyConfirmSignUp,
    signOut as amplifySignOut,
    getCurrentUser as amplifyGetCurrentUser,
    fetchAuthSession,
    fetchUserAttributes,
} from "aws-amplify/auth";

const userPoolId = process.env.EXPO_PUBLIC_USER_POOL_ID;
const userPoolClientId = process.env.EXPO_PUBLIC_USER_POOL_CLIENT_ID;
const region = process.env.EXPO_PUBLIC_AWS_REGION || "us-east-1";

export function isAuthConfigured() {
    return !!(userPoolId && userPoolClientId);
}

if (userPoolId && userPoolClientId) {
    Amplify.configure({
        Auth: {
            Cognito: {
                userPoolId,
                userPoolClientId,
                region,
                loginWith: {
                    email: true,
                },
            },
        },
    });
}

/**
 * Sign in with email and password.
 * @returns {Promise<object>} User/session result from Amplify
 */
export async function signIn(email, password) {
    const result = await amplifySignIn({
        username: email,
        password,
    });
    return result;
}

/**
 * Sign up with email, password, and display name.
 * @returns {Promise<object>} Confirmation result (e.g. nextStep, userId)
 */
export async function signUp(email, password, name) {
    const result = await amplifySignUp({
        username: email,
        password,
        options: {
            userAttributes: {
                email,
                name: name || email,
            },
        },
    });
    return result;
}

/**
 * Confirm sign up with the verification code sent to email.
 * @param {string} email - User's email (username)
 * @param {string} code - Verification code from email
 */
export async function confirmSignUp(email, code) {
    await amplifyConfirmSignUp({
        username: email,
        confirmationCode: code,
    });
}

/**
 * Sign out the current user.
 */
export async function signOut() {
    await amplifySignOut();
}

/**
 * Get the currently signed-in user's id, name, and email.
 * @returns {Promise<{ userId: string, name: string, email: string }>}
 * @throws If not signed in
 */
export async function getCurrentUser() {
    const { userId, username } = await amplifyGetCurrentUser();
    let name = username;
    let email = username;
    try {
        const attrs = await fetchUserAttributes();
        if (attrs.email) email = attrs.email;
        if (attrs.name) name = attrs.name;
    } catch (_) {}
    return { userId, name, email };
}

/**
 * Get the current JWT access token.
 * @returns {Promise<string>} Access token string
 * @throws If not signed in or session invalid
 */
export async function getToken() {
    const session = await fetchAuthSession();
    const token = session?.tokens?.accessToken?.toString?.();
    if (!token) throw new Error("No access token");
    return token;
}
