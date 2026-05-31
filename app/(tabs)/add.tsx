import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Coffee, Car, Film, Heart, ShoppingBag, Home, Book, Package, ChevronDown, Check, ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Home', 'Education', 'Other'];

const CATEGORY_COLORS: Record<string, string> = {
    Food: '#F97316', Transport: '#3B82F6', Entertainment: '#A855F7',
    Health: '#EF4444', Shopping: '#EC4899', Home: '#14B8A6',
    Education: '#6366F1', Other: '#6B7280',
};

const getCategoryIcon = (category: string, color: string) => {
    switch (category) {
        case 'Food': return <Coffee color={color} size={24} />;
        case 'Transport': return <Car color={color} size={24} />;
        case 'Entertainment': return <Film color={color} size={24} />;
        case 'Health': return <Heart color={color} size={24} />;
        case 'Shopping': return <ShoppingBag color={color} size={24} />;
        case 'Home': return <Home color={color} size={24} />;
        case 'Education': return <Book color={color} size={24} />;
        default: return <Package color={color} size={24} />;
    }
};

export default function AddExpenseScreen() {
    const router = useRouter();
    const { profile } = useStore();
    const colorScheme = useColorScheme();

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Other');
    const [confidence, setConfidence] = useState(0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const [isCategorizing, setIsCategorizing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    const typingTimer = useRef<NodeJS.Timeout | null>(null);

    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [customCategoryColors, setCustomCategoryColors] = useState<Record<string, string>>({});

    useEffect(() => {
        const loadCats = async () => {
            if (profile?.id) {
                const saved = await AsyncStorage.getItem(`@custom_cats_${profile.id}`);
                if (saved) setCustomCategories(JSON.parse(saved));
                const savedColors = await AsyncStorage.getItem(`@custom_cat_colors_${profile.id}`);
                if (savedColors) setCustomCategoryColors(JSON.parse(savedColors));
            }
        };
        loadCats();
    }, [profile?.id]);

    const getCatColor = (cat: string) => CATEGORY_COLORS[cat] || customCategoryColors[cat] || '#6B7280';

    const isDark = colorScheme === 'dark';
    const bgColor = isDark ? '#121212' : '#F9FAFB';
    const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#111827';
    const secondaryText = isDark ? '#9CA3AF' : '#6B7280';
    const inputBgColor = isDark ? '#1E1E1E' : '#F5F5F5';
    const borderColor = isDark ? '#333333' : '#E0E0E0';
    const primaryColor = '#4F46E5';

    const handleDescriptionChange = (text: string) => {
        setDescription(text);

        if (typingTimer.current) {
            clearTimeout(typingTimer.current);
        }

        if (text.length > 3) {
            typingTimer.current = setTimeout(() => {
                categorizeExpense(text);
            }, 800);
        }
    };

    const categorizeExpense = async (text: string) => {
        setIsCategorizing(true);
        try {
            // For now, call Supabase Edge Function to categorize
            const { data, error } = await supabase.functions.invoke('categorize-expense', {
                body: { description: text }
            });

            if (error) throw error;

            if (data && data.category) {
                setCategory(data.category);
                setConfidence(data.confidence || 0);
            }
        } catch (err) {
            console.log('AI categorization failed, defaulting to Other', err);
            // Let it stay as what it was, or default to Other
        } finally {
            setIsCategorizing(false);
        }
    };

    const handleSave = async () => {
        if (!amount || isNaN(Number(amount))) {
            Alert.alert('Error', 'Please enter a valid amount.');
            return;
        }
        if (!description) {
            Alert.alert('Error', 'Please enter a description.');
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('expenses')
                .insert({
                    user_id: profile?.id,
                    amount: parseFloat(amount),
                    description,
                    category,
                    category_confidence: confidence,
                    date
                });

            if (error) throw error;

            router.back();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save expense.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: bgColor }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: textColor }]}>Add Expense</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

                <View style={styles.amountContainer}>
                    <Text style={[styles.currencySymbol, { color: textColor }]}>
                        {profile?.currency === 'ESP' ? '€' : '$'}
                    </Text>
                    <TextInput
                        style={[styles.amountInput, { color: textColor }]}
                        placeholder="0.00"
                        placeholderTextColor={secondaryText}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                        autoFocus
                    />
                </View>

                <View style={[styles.form, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: secondaryText }]}>Description</Text>
                        <TextInput
                            style={[styles.input, { color: textColor, borderBottomColor: borderColor }]}
                            placeholder="What did you spend on?"
                            placeholderTextColor={secondaryText}
                            value={description}
                            onChangeText={handleDescriptionChange}
                            onBlur={() => {
                                if (description.length > 3 && !isCategorizing) {
                                    categorizeExpense(description);
                                }
                            }}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: secondaryText }]}>Category</Text>
                        <TouchableOpacity
                            style={[styles.categorySelector, { borderBottomColor: borderColor }]}
                            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                        >
                            <View style={styles.categoryRow}>
                                <View style={[styles.iconBox, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
                                    {getCategoryIcon(category, getCatColor(category))}
                                </View>
                                <Text style={[styles.categoryText, { color: textColor }]}>{category}</Text>
                            </View>

                            {isCategorizing ? (
                                <ActivityIndicator color={primaryColor} size="small" />
                            ) : (
                                <ChevronDown color={secondaryText} size={24} />
                            )}
                        </TouchableOpacity>

                        {showCategoryPicker && (
                            <View style={[styles.categoryPicker, { backgroundColor: inputBgColor }]}>
                                {[...CATEGORIES, ...customCategories].map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={styles.categoryOption}
                                        onPress={() => {
                                            setCategory(cat);
                                            setShowCategoryPicker(false);
                                        }}
                                    >
                                        <View style={styles.categoryRow}>
                                            {getCategoryIcon(cat, getCatColor(cat))}
                                            <Text style={[styles.optionText, { color: textColor }]}>{cat}</Text>
                                        </View>
                                        {category === cat && <Check color={primaryColor} size={20} />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    <View style={[styles.inputGroup, { borderBottomWidth: 0 }]}>
                        <Text style={[styles.label, { color: secondaryText }]}>Date</Text>
                        <TextInput
                            style={[styles.input, { color: textColor, borderBottomWidth: 0 }]}
                            value={date}
                            onChangeText={setDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={secondaryText}
                        />
                    </View>
                </View>

            </ScrollView>

            <View style={[styles.footer, { backgroundColor: bgColor }]}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: primaryColor, opacity: isSaving ? 0.7 : 1 }]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.buttonText}>Save Expense</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 24,
    },
    amountContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 40,
    },
    currencySymbol: {
        fontSize: 48,
        fontWeight: '600',
        marginRight: 12,
    },
    amountInput: {
        fontSize: 64,
        fontWeight: '800',
        minWidth: 150,
    },
    form: {
        borderRadius: 24,
        borderWidth: 1,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    inputGroup: {
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        fontSize: 16,
        height: 48,
    },
    categorySelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    categoryText: {
        fontSize: 16,
        fontWeight: '500',
    },
    categoryPicker: {
        marginTop: 12,
        borderRadius: 16,
        overflow: 'hidden',
    },
    categoryOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    optionText: {
        fontSize: 16,
        marginLeft: 12,
    },
    footer: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    button: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },
});
