import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ArrowLeft, Shield } from 'lucide-react-native';

export default function PrivacyScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const bgColor = isDark ? '#121212' : '#F9FAFB';
    const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#111827';
    const secondaryText = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#333333' : '#E0E0E0';
    const primaryColor = '#4F46E5';

    const sections = [
        {
            title: '1. Information We Collect',
            body: `SpendWise collects the following information to provide and improve the service:\n\n• Account Information: Your email address and display name, used for authentication and personalization.\n\n• Financial Inputs: Expense amounts, descriptions, categories, and budget settings that you enter manually. This data is used solely to provide you with spending insights and reports.\n\n• Usage Data: Basic app interaction data (e.g., session activity) to maintain your logged-in state and refresh tokens.`,
        },
        {
            title: '2. How We Use Your Data',
            body: `Your data is used exclusively to:\n\n• Authenticate your account and maintain your session.\n• Display your expenses, budgets, and weekly reports.\n• Provide personalized spending insights.\n\nWe do not sell, rent, or share your personal data with third parties for marketing purposes.`,
        },
        {
            title: '3. Data Storage & Security',
            body: `All data is stored securely using Supabase, a trusted open-source backend platform. Supabase provides:\n\n• Encrypted data transmission (HTTPS/TLS).\n• Row Level Security (RLS) policies ensuring you can only access your own data.\n• Secure authentication via Supabase Auth with token-based sessions.\n\nYour password is never stored in plain text — it is hashed and managed entirely by Supabase Auth.`,
        },
        {
            title: '4. Data Retention',
            body: `Your data is retained as long as your account is active. If you delete your account, all associated data (profile, expenses, recurring expenses, and reports) will be permanently removed from our database.`,
        },
        {
            title: '5. Your Rights',
            body: `You have the right to:\n\n• Access all data associated with your account (visible within the app).\n• Update or correct your personal information via the Profile screen.\n• Request deletion of your account and all associated data by contacting us.\n• Export your expense data at any time.`,
        },
        {
            title: '6. Third-Party Services',
            body: `SpendWise uses the following third-party services:\n\n• Supabase — for authentication, database, and storage.\n• Google Sign-In (optional) — for OAuth-based login.\n\nThese services have their own privacy policies, which we encourage you to review.`,
        },
        {
            title: '7. Changes to This Policy',
            body: `We may update this Privacy Policy from time to time. Any changes will be reflected within the app. Continued use of SpendWise after changes constitutes acceptance of the updated policy.`,
        },
        {
            title: '8. Contact',
            body: `If you have questions about this Privacy Policy or your data, please reach out through the app's support channels.`,
        },
    ];

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: textColor }]}>Privacy & Security</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Hero */}
                <View style={styles.heroSection}>
                    <View style={[styles.heroIcon, { backgroundColor: '#DCFCE7' }]}>
                        <Shield color="#16A34A" size={32} />
                    </View>
                    <Text style={[styles.heroTitle, { color: textColor }]}>Your Privacy Matters</Text>
                    <Text style={[styles.heroSubtitle, { color: secondaryText }]}>
                        SpendWise is committed to protecting your personal and financial data.
                    </Text>
                </View>

                {/* Last updated */}
                <Text style={[styles.lastUpdated, { color: secondaryText }]}>
                    Last updated: March 20, 2026
                </Text>

                {/* Policy Sections */}
                {sections.map((section, index) => (
                    <View
                        key={index}
                        style={[styles.sectionCard, { backgroundColor: cardBg, borderColor }]}
                    >
                        <Text style={[styles.sectionTitle, { color: primaryColor }]}>
                            {section.title}
                        </Text>
                        <Text style={[styles.sectionBody, { color: secondaryText }]}>
                            {section.body}
                        </Text>
                    </View>
                ))}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    scrollContent: { padding: 24, paddingTop: 16 },
    heroSection: { alignItems: 'center', marginBottom: 24 },
    heroIcon: {
        width: 72,
        height: 72,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    heroTitle: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
    heroSubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
    lastUpdated: { fontSize: 13, textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },
    sectionCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 14,
        borderWidth: 1,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
    sectionBody: { fontSize: 14.5, lineHeight: 22 },
});
