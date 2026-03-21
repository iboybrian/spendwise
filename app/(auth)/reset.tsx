import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
    ScrollView
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';

export default function ResetPasswordScreen() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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

    const handleUpdatePassword = async () => {
        if (!newPassword) {
            showAlert('Error', 'Please enter a new password.');
            return;
        }
        if (newPassword.length < 6) {
            showAlert('Error', 'Password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            showAlert('Error', 'Passwords do not match. Please try again.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) {
                showAlert('Error', error.message);
            } else {
                showAlert('Success', 'Your password has been updated successfully!');
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
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: '#DCFCE7' }]}>
                        <ShieldCheck color="#16A34A" size={32} />
                    </View>
                    <Text style={[styles.title, { color: textColor }]}>Reset Password</Text>
                    <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                        Enter your new password below to update your account.
                    </Text>
                </View>

                <View style={styles.form}>
                    <View style={[styles.inputContainer, { backgroundColor: inputBgColor, borderColor }]}>
                        <Lock color={secondaryTextColor} size={20} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: textColor, flex: 1 }]}
                            placeholder="New Password"
                            placeholderTextColor={secondaryTextColor}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry={!showPassword}
                            autoFocus
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                            {showPassword ? <EyeOff color={secondaryTextColor} size={20} /> : <Eye color={secondaryTextColor} size={20} />}
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.inputContainer, { backgroundColor: inputBgColor, borderColor }]}>
                        <Lock color={secondaryTextColor} size={20} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: textColor, flex: 1 }]}
                            placeholder="Confirm New Password"
                            placeholderTextColor={secondaryTextColor}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showPassword}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: primaryColor, opacity: loading ? 0.7 : 1 }]}
                        onPress={handleUpdatePassword}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.buttonText}>Update Password</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(auth)/login')}>
                        <Text style={[styles.backButtonText, { color: secondaryTextColor }]}>
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
    header: { alignItems: 'center', marginBottom: 40 },
    iconContainer: {
        width: 72, height: 72, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    title: { fontSize: 28, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
    subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
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
    backButton: { padding: 16, alignItems: 'center' },
    backButtonText: { fontSize: 15 },
});
