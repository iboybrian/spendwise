import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView,
    Alert, TextInput, Modal, Pressable, Platform
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
    User, LogOut, Bell, DollarSign, Globe, Shield, ChevronRight,
    Check, Pencil, X
} from 'lucide-react-native';

const CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'GTQ', name: 'Guatemalan Quetzal', symbol: 'Q' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'HNL', name: 'Lempira (HN)', symbol: 'L' },
    { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡' },
    { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
    { code: 'COP', name: 'Colombian Peso', symbol: 'COL$' },
    { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/' },
    { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
];

const LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
];

export default function ProfileScreen() {
    const { profile, setProfile, clearSession } = useStore();
    const colorScheme = useColorScheme();
    const router = useRouter();

    const [notifications, setNotifications] = useState(true);

    // Editing states
    const [editingName, setEditingName] = useState(false);
    const [firstName, setFirstName] = useState(profile?.full_name?.split(' ')[0] || '');
    const [lastName, setLastName] = useState(profile?.full_name?.split(' ').slice(1).join(' ') || '');

    const [editingBudget, setEditingBudget] = useState(false);
    const [newBudget, setNewBudget] = useState(profile?.weekly_budget?.toString() || '');

    // Picker modals
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
    const [showLanguagePicker, setShowLanguagePicker] = useState(false);

    const isDark = colorScheme === 'dark';
    const bgColor = isDark ? '#121212' : '#F9FAFB';
    const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#111827';
    const secondaryText = isDark ? '#9CA3AF' : '#6B7280';
    const primaryColor = '#4F46E5';
    const borderColor = isDark ? '#333333' : '#E0E0E0';
    const modalBg = isDark ? '#1A1A2E' : '#FFFFFF';
    const inputBg = isDark ? '#2D2D44' : '#F3F4F6';

    const handleLogout = async () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out', style: 'destructive',
                onPress: async () => {
                    await supabase.auth.signOut();
                    clearSession();
                    router.replace('/(auth)/login');
                }
            }
        ]);
    };

    const saveField = async (field: string, value: any) => {
        try {
            // Optimistically update Zustand immediately so UI reflects the change
            if (profile) {
                setProfile({ ...profile, [field]: value } as any);
            }
            const { data, error } = await supabase
                .from('users')
                .update({ [field]: value })
                .eq('id', profile?.id)
                .select()
                .single();
            if (error) throw error;
            // If Supabase returned the updated row, use it (more accurate)
            if (data) setProfile(data);
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const saveName = async () => {
        const name = `${firstName.trim()} ${lastName.trim()}`.trim();
        if (!name) {
            Alert.alert('Error', 'Please enter your name.');
            return;
        }
        await saveField('full_name', name);
        setEditingName(false);
    };

    const saveBudget = async () => {
        const budgetNum = parseFloat(newBudget);
        if (isNaN(budgetNum) || budgetNum <= 0) {
            Alert.alert('Invalid', 'Please enter a valid number.');
            return;
        }
        await saveField('weekly_budget', budgetNum);
        setEditingBudget(false);
    };

    const selectCurrency = async (code: string) => {
        await saveField('currency', code);
        setShowCurrencyPicker(false);
    };

    const selectLanguage = async (code: string) => {
        await saveField('language', code);
        setShowLanguagePicker(false);
    };

    const currentCurrency = CURRENCIES.find(c => c.code === profile?.currency) || CURRENCIES[0];
    const currentLanguage = LANGUAGES.find(l => l.code === profile?.language) || LANGUAGES[0];

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
                    <Text style={[styles.headerTitle, { color: textColor }]}>Profile</Text>
                </View>

                {/* Avatar & Name Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                    </View>

                    {editingName ? (
                        <View style={styles.nameEditContainer}>
                            <TextInput
                                style={[styles.nameInput, { color: textColor, backgroundColor: inputBg, borderColor }]}
                                placeholder="First Name"
                                placeholderTextColor={secondaryText}
                                value={firstName}
                                onChangeText={setFirstName}
                                autoFocus
                            />
                            <TextInput
                                style={[styles.nameInput, { color: textColor, backgroundColor: inputBg, borderColor }]}
                                placeholder="Last Name"
                                placeholderTextColor={secondaryText}
                                value={lastName}
                                onChangeText={setLastName}
                            />
                            <View style={styles.nameButtons}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingName(false)}>
                                    <Text style={{ color: secondaryText, fontWeight: '600' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primaryColor }]} onPress={saveName}>
                                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => setEditingName(true)} style={styles.nameRow}>
                            <Text style={[styles.name, { color: textColor }]}>
                                {profile?.full_name || 'Tap to add name'}
                            </Text>
                            <Pencil color={secondaryText} size={16} style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    )}
                    <Text style={[styles.email, { color: secondaryText }]}>{profile?.email}</Text>
                </View>

                {/* Preferences */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: secondaryText }]}>PREFERENCES</Text>
                    <View style={[styles.card, { backgroundColor: cardBg }]}>

                        {/* Weekly Budget */}
                        <View style={[styles.row, { borderBottomColor: borderColor, borderBottomWidth: 1 }]}>
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconBox, { backgroundColor: '#E0E7FF' }]}>
                                    <DollarSign color={primaryColor} size={20} />
                                </View>
                                <Text style={[styles.rowLabel, { color: textColor }]}>Weekly Budget</Text>
                            </View>
                            {editingBudget ? (
                                <View style={styles.editBudgetRow}>
                                    <TextInput
                                        style={[styles.budgetInput, { color: textColor, borderBottomColor: primaryColor }]}
                                        value={newBudget}
                                        onChangeText={setNewBudget}
                                        keyboardType="numeric"
                                        autoFocus
                                    />
                                    <TouchableOpacity onPress={saveBudget}>
                                        <Text style={{ color: primaryColor, fontWeight: '600' }}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity onPress={() => setEditingBudget(true)}>
                                    <Text style={[styles.rowValue, { color: secondaryText }]}>
                                        {currentCurrency.symbol}{profile?.weekly_budget}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Currency */}
                        <TouchableOpacity
                            style={[styles.row, { borderBottomColor: borderColor, borderBottomWidth: 1 }]}
                            onPress={() => setShowCurrencyPicker(true)}
                        >
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                                    <DollarSign color="#16A34A" size={20} />
                                </View>
                                <Text style={[styles.rowLabel, { color: textColor }]}>Currency</Text>
                            </View>
                            <View style={styles.rowRight}>
                                <Text style={[styles.rowValue, { color: secondaryText }]}>{currentCurrency.code}</Text>
                                <ChevronRight color={secondaryText} size={20} />
                            </View>
                        </TouchableOpacity>

                        {/* Language */}
                        <TouchableOpacity
                            style={[styles.row, { borderBottomColor: borderColor, borderBottomWidth: 1 }]}
                            onPress={() => setShowLanguagePicker(true)}
                        >
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                                    <Globe color="#D97706" size={20} />
                                </View>
                                <Text style={[styles.rowLabel, { color: textColor }]}>Language</Text>
                            </View>
                            <View style={styles.rowRight}>
                                <Text style={[styles.rowValue, { color: secondaryText }]}>
                                    {currentLanguage.flag} {currentLanguage.name}
                                </Text>
                                <ChevronRight color={secondaryText} size={20} />
                            </View>
                        </TouchableOpacity>

                        {/* Notifications */}
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconBox, { backgroundColor: '#FCE7F3' }]}>
                                    <Bell color="#DB2777" size={20} />
                                </View>
                                <Text style={[styles.rowLabel, { color: textColor }]}>Weekly Reports</Text>
                            </View>
                            <Switch
                                value={notifications}
                                onValueChange={setNotifications}
                                trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
                                thumbColor={notifications ? primaryColor : '#F3F4F6'}
                            />
                        </View>
                    </View>
                </View>

                {/* Account */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: secondaryText }]}>ACCOUNT</Text>
                    <View style={[styles.card, { backgroundColor: cardBg }]}>
                        <TouchableOpacity style={[styles.row, { borderBottomColor: borderColor, borderBottomWidth: 1 }]}>
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                                    <Shield color="#16A34A" size={20} />
                                </View>
                                <Text style={[styles.rowLabel, { color: textColor }]}>Privacy & Security</Text>
                            </View>
                            <ChevronRight color={secondaryText} size={20} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.row} onPress={handleLogout}>
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
                                    <LogOut color="#EF4444" size={20} />
                                </View>
                                <Text style={[styles.rowLabel, { color: '#EF4444', fontWeight: '600' }]}>Log Out</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* ===== Currency Picker Modal ===== */}
            <Modal visible={showCurrencyPicker} transparent animationType="fade" onRequestClose={() => setShowCurrencyPicker(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowCurrencyPicker(false)}>
                    <Pressable style={[styles.modalCard, { backgroundColor: modalBg }]} onPress={() => { }}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>Select Currency</Text>
                            <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                                <X color={secondaryText} size={22} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {CURRENCIES.map(c => (
                                <TouchableOpacity
                                    key={c.code}
                                    style={[
                                        styles.pickerItem,
                                        profile?.currency === c.code && { backgroundColor: isDark ? '#2D2D44' : '#E0E7FF' }
                                    ]}
                                    onPress={() => selectCurrency(c.code)}
                                >
                                    <View>
                                        <Text style={[styles.pickerMain, { color: textColor }]}>{c.symbol} — {c.name}</Text>
                                        <Text style={[styles.pickerSub, { color: secondaryText }]}>{c.code}</Text>
                                    </View>
                                    {profile?.currency === c.code && <Check color={primaryColor} size={20} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ===== Language Picker Modal ===== */}
            <Modal visible={showLanguagePicker} transparent animationType="fade" onRequestClose={() => setShowLanguagePicker(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowLanguagePicker(false)}>
                    <Pressable style={[styles.modalCard, { backgroundColor: modalBg }]} onPress={() => { }}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>Select Language</Text>
                            <TouchableOpacity onPress={() => setShowLanguagePicker(false)}>
                                <X color={secondaryText} size={22} />
                            </TouchableOpacity>
                        </View>
                        {LANGUAGES.map(l => (
                            <TouchableOpacity
                                key={l.code}
                                style={[
                                    styles.pickerItem,
                                    profile?.language === l.code && { backgroundColor: isDark ? '#2D2D44' : '#E0E7FF' }
                                ]}
                                onPress={() => selectLanguage(l.code)}
                            >
                                <Text style={[styles.pickerMain, { color: textColor }]}>{l.flag}  {l.name}</Text>
                                {profile?.language === l.code && <Check color={primaryColor} size={20} />}
                            </TouchableOpacity>
                        ))}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    header: { paddingTop: 60, paddingBottom: 20, alignItems: 'center', borderBottomWidth: 1 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    profileSection: { alignItems: 'center', paddingVertical: 32 },
    avatar: {
        width: 96, height: 96, borderRadius: 48, backgroundColor: '#4F46E5',
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
        shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
    },
    avatarText: { fontSize: 40, fontWeight: '700', color: '#FFF' },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    name: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
    email: { fontSize: 16, marginTop: 4 },
    nameEditContainer: { width: '80%', gap: 10, marginBottom: 8 },
    nameInput: {
        height: 48, borderWidth: 1, borderRadius: 12,
        paddingHorizontal: 16, fontSize: 16,
    },
    nameButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
    cancelBtn: { paddingVertical: 8, paddingHorizontal: 16 },
    saveBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 10 },
    section: { paddingHorizontal: 24, marginBottom: 32 },
    sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12, letterSpacing: 1 },
    card: {
        borderRadius: 24, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    row: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, minHeight: 72,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    rowRight: { flexDirection: 'row', alignItems: 'center' },
    iconBox: {
        width: 40, height: 40, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center', marginRight: 16,
    },
    rowLabel: { fontSize: 16, fontWeight: '500' },
    rowValue: { fontSize: 16, marginRight: 8 },
    editBudgetRow: { flexDirection: 'row', alignItems: 'center' },
    budgetInput: { width: 80, borderBottomWidth: 1, marginRight: 12, fontSize: 16, textAlign: 'right' },

    // Modal styles
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center',
    },
    modalCard: {
        width: '90%', maxWidth: 400, borderRadius: 24, padding: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16,
    },
    modalTitle: { fontSize: 20, fontWeight: '800' },
    pickerItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 2,
    },
    pickerMain: { fontSize: 16, fontWeight: '500' },
    pickerSub: { fontSize: 13, marginTop: 2 },
});
