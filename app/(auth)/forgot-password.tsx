import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
    ScrollView
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    const handleSendResetLink = async () => {
        if (!email) {
            showAlert('Error', 'Please enter your email address.');
            return;
        }
        if (!isValidEmail(email)) {
            showAlert('Invalid Email', 'Please enter a valid email address.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://spendwise-topaz.vercel.app/reset',
            });
            if (error) {
                showAlert('Error', error.message);
            } else {
                showAlert('Check your email', 'If an account exists, a reset link has been sent.');
                router.replace('/(auth)/login');
            }
        } catch (e: any) {
            showAlert('Error', e.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const backgroundColor = isDark ? '#0F0F23' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#111827';
    const secondaryTextColor = isDark ? '#9CA3AF' : '#6B7280';
    const inputBgColor = isDark ? '#1A1A2E' : '#F3F4F6';
    const borderColor = isDark ? '#2D2D44' : '#E5E7EB';
    const primaryColor = '#4F46E5';

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Back button */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>

                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                        <KeyRound color={primaryColor} size={32} />
                    </View>
                    <Text style={[styles.title, { color: textColor }]}>Forgot Password?</Text>
                    <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                        Please enter your email so we can send you a link to troubleshoot.
                    </Text>
                </View>

                <View style={styles.form}>
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
                            autoFocus
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: primaryColor, opacity: loading ? 0.7 : 1 }]}
                        onPress={handleSendResetLink}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.buttonText}>Send Reset Link</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.backToLogin} onPress={() => router.replace('/(auth)/login')}>
                        <Text style={[styles.backToLoginText, { color: secondaryTextColor }]}>
                            Back to <Text style={{ color: primaryColor, fontWeight: '700' }}>Login</Text>
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
    backButton: {
        position: 'absolute', top: 16, left: 0,
        width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
    },
    header: { alignItems: 'center', marginBottom: 40 },
    iconContainer: {
        width: 72, height: 72, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    title: { fontSize: 28, fontWeight: '800', marginBottom: 12, letterSpacing: -0.5 },
    subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 16 },
    form: { gap: 14 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        height: 56, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, height: '100%' },
    button: { height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
    buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
    backToLogin: { padding: 16, alignItems: 'center' },
    backToLoginText: { fontSize: 15 },
});
