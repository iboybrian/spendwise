import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
    ScrollView
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Wallet, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const { setSession, setProfile, setInitialized } = useStore();

    const fetchProfileAndRedirect = async (userId: string, session: any) => {
        try {
            setSession(session);
            const { data } = await supabase.from('users').select('*').eq('id', userId).single();
            if (data) {
                setProfile(data);
                setInitialized(true);
                if (!data.onboarding_completed) {
                    router.replace('/(onboarding)');
                } else {
                    router.replace('/(tabs)');
                }
            } else {
                // New user, profile might not exist yet (trigger creates it)
                setInitialized(true);
                router.replace('/(onboarding)');
            }
        } catch (e) {
            console.log('Profile fetch after login error:', e);
            setInitialized(true);
        }
    };

    // Cross-platform alert: Alert.alert is a no-op on web
    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleAuth = async () => {
        if (!email || !password) {
            showAlert('Error', 'Please enter both email and password.');
            return;
        }

        setLoading(true);

        if (isLogin) {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                showAlert('Authentication Error', error.message);
                setLoading(false);
                return;
            }
            // Directly handle session on mobile instead of relying on onAuthStateChange
            if (data.session) {
                await fetchProfileAndRedirect(data.session.user.id, data.session);
            }
        } else {
            if (!fullName) {
                showAlert('Error', 'Please enter your full name.');
                setLoading(false);
                return;
            }
            if (password !== confirmPassword) {
                showAlert('Error', 'Passwords do not match. Please try again.');
                setLoading(false);
                return;
            }
            try {
                // Build redirect URL for deep linking (may fail on web)
                let redirectUrl: string | undefined;
                try {
                    redirectUrl = makeRedirectUri({ scheme: 'spendwise' });
                } catch {
                    // On web or unsupported platforms, skip the redirect
                }

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName },
                        ...(redirectUrl ? { emailRedirectTo: redirectUrl } : {}),
                    }
                });
                if (error) {
                    showAlert('Authentication Error', error.message);
                    setLoading(false);
                    return;
                }
                // Check for duplicate account (Supabase returns user with empty identities)
                if (data?.user?.identities?.length === 0) {
                    showAlert('Account already exists', 'An account with this email already exists. Please log in instead.');
                    setLoading(false);
                    return;
                }
                // If session exists, Supabase auto-confirmed → redirect
                if (data.session) {
                    await fetchProfileAndRedirect(data.session.user.id, data.session);
                } else {
                    // Email confirmation required — don't redirect or update store
                    showAlert(
                        'Check your email!',
                        'We sent a validation link to your inbox. Please verify your email to log in.'
                    );
                }
            } catch (e: any) {
                showAlert('Sign Up Error', e.message || 'Something went wrong.');
            }
        }
        setLoading(false);
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        try {
            const redirectUrl = makeRedirectUri({ scheme: 'spendwise' });
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
            });
            if (error) throw error;
            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                if (result.type === 'success' && result.url) {
                    const url = new URL(result.url);
                    const params = new URLSearchParams(url.hash.replace('#', '?'));
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');
                    if (accessToken && refreshToken) {
                        const { data: sessionData } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                        if (sessionData?.session) {
                            await fetchProfileAndRedirect(sessionData.session.user.id, sessionData.session);
                        }
                    }
                }
            }
        } catch (err: any) {
                showAlert('Google Sign-In Error', err.message || 'Something went wrong.');
        } finally {
            setGoogleLoading(false);
        }
    };


    const backgroundColor = isDark ? '#0F0F23' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#111827';
    const secondaryTextColor = isDark ? '#9CA3AF' : '#6B7280';
    const inputBgColor = isDark ? '#1A1A2E' : '#F3F4F6';
    const borderColor = isDark ? '#2D2D44' : '#E5E7EB';
    const primaryColor = '#4F46E5';
    const cardBg = isDark ? '#16162A' : '#FFFFFF';

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: primaryColor }]}>
                        <Wallet color="#FFF" size={32} />
                    </View>
                    <Text style={[styles.title, { color: textColor }]}>SpendWise</Text>
                    <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                        {isLogin ? 'Welcome back! Log in to continue.' : 'Create your account and start tracking.'}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.googleButton, { borderColor, backgroundColor: cardBg }]}
                    onPress={handleGoogleSignIn}
                    disabled={googleLoading}
                >
                    {googleLoading ? (
                        <ActivityIndicator color={textColor} />
                    ) : (
                        <>
                            <Text style={styles.googleIcon}>G</Text>
                            <Text style={[styles.googleButtonText, { color: textColor }]}>Continue with Google</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                    <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
                    <Text style={[styles.dividerText, { color: secondaryTextColor }]}>or</Text>
                    <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
                </View>

                <View style={styles.form}>
                    {!isLogin && (
                        <View style={[styles.inputContainer, { backgroundColor: inputBgColor, borderColor }]}>
                            <TextInput
                                style={[styles.input, { color: textColor }]}
                                placeholder="Full Name"
                                placeholderTextColor={secondaryTextColor}
                                value={fullName}
                                onChangeText={setFullName}
                            />
                        </View>
                    )}

                    <View style={[styles.inputContainer, { backgroundColor: inputBgColor, borderColor }]}>
                        <Mail color={secondaryTextColor} size={20} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: textColor }]}
                            placeholder="Email address"
                            placeholderTextColor={secondaryTextColor}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={[styles.inputContainer, { backgroundColor: inputBgColor, borderColor }]}>
                        <Lock color={secondaryTextColor} size={20} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: textColor, flex: 1 }]}
                            placeholder="Password"
                            placeholderTextColor={secondaryTextColor}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                            {showPassword ? <EyeOff color={secondaryTextColor} size={20} /> : <Eye color={secondaryTextColor} size={20} />}
                        </TouchableOpacity>
                    </View>

                    {!isLogin && (
                        <View style={[styles.inputContainer, { backgroundColor: inputBgColor, borderColor }]}>
                            <Lock color={secondaryTextColor} size={20} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: textColor, flex: 1 }]}
                                placeholder="Confirm Password"
                                placeholderTextColor={secondaryTextColor}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showPassword}
                            />
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: primaryColor, opacity: loading ? 0.7 : 1 }]}
                        onPress={handleAuth}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{isLogin ? 'Log In' : 'Create Account'}</Text>}
                    </TouchableOpacity>

                    {isLogin && (
                        <TouchableOpacity style={styles.forgotButton} onPress={() => router.push('/(auth)/forgot-password')}>
                            <Text style={[styles.forgotButtonText, { color: primaryColor }]}>Forgot Password?</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.switchButton} onPress={() => setIsLogin(!isLogin)}>
                        <Text style={[styles.switchButtonText, { color: secondaryTextColor }]}>
                            {isLogin ? "Don't have an account? " : 'Already have an account? '}
                            <Text style={{ color: primaryColor, fontWeight: '700' }}>{isLogin ? 'Sign up' : 'Log in'}</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 40 },
    iconContainer: {
        width: 72, height: 72, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
        shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35, shadowRadius: 12, elevation: 10,
    },
    title: { fontSize: 34, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
    subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
    googleButton: {
        flexDirection: 'row', height: 56, borderRadius: 14, borderWidth: 1.5,
        justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    },
    googleIcon: { fontSize: 22, fontWeight: '800', marginRight: 12, color: '#4285F4' },
    googleButtonText: { fontSize: 16, fontWeight: '600' },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    dividerLine: { flex: 1, height: 1 },
    dividerText: { paddingHorizontal: 16, fontSize: 14, fontWeight: '500' },
    form: { gap: 14 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        height: 56, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, height: '100%' },
    eyeButton: { padding: 8 },
    button: { height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
    buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
    forgotButton: { alignItems: 'flex-end', paddingTop: 4 },
    forgotButtonText: { fontSize: 14, fontWeight: '600' },
    switchButton: { padding: 16, alignItems: 'center' },
    switchButtonText: { fontSize: 15 },
});
