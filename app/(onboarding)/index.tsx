import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Alert, ScrollView, FlatList, useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from 'react-i18next';
import { DollarSign, PieChart, ArrowRight, Check, Plus, Receipt, Trash2 } from 'lucide-react-native';

interface MonthlyCost {
    description: string;
    amount: string;
}

export default function OnboardingScreen() {
    const [step, setStep] = useState(1);
    const [income, setIncome] = useState('');
    const [budget, setBudget] = useState('');
    const [saving, setSaving] = useState(false);
    const colorScheme = useColorScheme();
    const router = useRouter();
    const { profile, setProfile } = useStore();
    const { t } = useTranslation();

    // Monthly costs state
    const [monthlyCosts, setMonthlyCosts] = useState<MonthlyCost[]>([]);
    const [costDescription, setCostDescription] = useState('');
    const [costAmount, setCostAmount] = useState('');

    const { width: windowWidth } = useWindowDimensions();

    const isDark = colorScheme === 'dark';
    const backgroundColor = isDark ? '#121212' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#121212';
    const secondaryTextColor = isDark ? '#A0A0A0' : '#666666';
    const inputBgColor = isDark ? '#1E1E1E' : '#F5F5F5';
    const borderColor = isDark ? '#333333' : '#E0E0E0';
    const primaryColor = '#4F46E5';
    const cardBg = isDark ? '#1A1A2E' : '#F9FAFB';

    // Responsive horizontal padding — tighter on small screens to avoid overflow
    const horizontalPadding = windowWidth < 380 ? 16 : 24;

    const TOTAL_STEPS = 4;

    const handleNext = () => {
        if (step === 2 && !income) {
            Alert.alert(t('onboarding.incomeRequired'), t('onboarding.incomeRequiredMsg'));
            return;
        }

        if (step === 2 && income) {
            const parsedIncome = parseFloat(income);
            if (!isNaN(parsedIncome)) {
                setBudget((parsedIncome * 0.25).toFixed(0));
            }
        }

        if (step === 3 && !budget) {
            Alert.alert(t('onboarding.budgetRequired'), t('onboarding.budgetRequiredMsg'));
            return;
        }

        if (step < TOTAL_STEPS) {
            setStep(step + 1);
        } else {
            handleFinish();
        }
    };

    const addMonthlyCost = () => {
        if (!costDescription.trim()) {
            Alert.alert(t('errors.generic'), t('onboarding.needDescription'));
            return;
        }
        const parsed = parseFloat(costAmount);
        if (!costAmount || isNaN(parsed) || parsed <= 0) {
            Alert.alert(t('errors.generic'), t('onboarding.invalidAmount'));
            return;
        }
        setMonthlyCosts([...monthlyCosts, { description: costDescription.trim(), amount: costAmount }]);
        setCostDescription('');
        setCostAmount('');
    };

    const removeMonthlyCost = (index: number) => {
        setMonthlyCosts(monthlyCosts.filter((_, i) => i !== index));
    };

    const handleFinish = async () => {
        setSaving(true);
        try {
            const parsedIncome = parseFloat(income);
            const parsedBudget = parseFloat(budget);

            const { data, error } = await supabase
                .from('users')
                .update({
                    salary: parsedIncome,
                    weekly_budget: parsedBudget,
                    onboarding_completed: true,
                })
                .eq('id', profile?.id)
                .select()
                .single();

            if (error) throw error;

            // Save monthly costs into recurring_expenses table
            if (monthlyCosts.length > 0 && profile?.id) {
                const costsToInsert = monthlyCosts.map(cost => ({
                    user_id: profile.id,
                    description: cost.description,
                    amount: parseFloat(cost.amount),
                    category: 'Home',
                    is_active: true,
                }));
                await supabase.from('recurring_expenses').insert(costsToInsert);
            }

            setProfile(data);
            router.replace('/(tabs)');

        } catch (error: any) {
            Alert.alert(t('errors.generic'), error.message || 'Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleSkipCosts = async () => {
        await handleFinish();
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                style={{ flex: 1, width: '100%' }}
                contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
                keyboardShouldPersistTaps="handled"
                showsHorizontalScrollIndicator={false}
            >

                {step === 1 && (
                    <View style={styles.stepContainer}>
                        <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                            <PieChart color={primaryColor} size={48} />
                        </View>
                        <Text style={[styles.title, { color: textColor }]}>{t('onboarding.welcomeTitle')}</Text>
                        <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                            {t('onboarding.welcomeSubtitle')}
                        </Text>
                    </View>
                )}

                {step === 2 && (
                    <View style={styles.stepContainer}>
                        <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                            <DollarSign color={primaryColor} size={48} />
                        </View>
                        <Text style={[styles.title, { color: textColor }]}>{t('onboarding.incomeTitle')}</Text>
                        <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                            {t('onboarding.incomeSubtitle')}
                        </Text>

                        <View style={[styles.inputContainer, { backgroundColor: inputBgColor, borderColor, alignSelf: 'center', width: '90%' }]}>
                            <Text style={[styles.currencySymbol, { color: textColor }]}>$</Text>
                            <TextInput
                                style={[styles.largeInput, { color: textColor }]}
                                placeholder="0.00"
                                placeholderTextColor={secondaryTextColor}
                                value={income}
                                onChangeText={setIncome}
                                keyboardType="numeric"
                                autoFocus
                            />
                        </View>
                    </View>
                )}

                {step === 3 && (
                    <View style={styles.stepContainer}>
                        <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                            <Check color={primaryColor} size={48} />
                        </View>
                        <Text style={[styles.title, { color: textColor }]}>{t('onboarding.budgetTitle')}</Text>
                        <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                            {t('onboarding.budgetSubtitle')}
                        </Text>

                        <View style={[styles.inputContainer, { backgroundColor: inputBgColor, borderColor, alignSelf: 'center', width: '90%' }]}>
                            <Text style={[styles.currencySymbol, { color: textColor }]}>$</Text>
                            <TextInput
                                style={[styles.largeInput, { color: textColor }]}
                                placeholder="0.00"
                                placeholderTextColor={secondaryTextColor}
                                value={budget}
                                onChangeText={setBudget}
                                keyboardType="numeric"
                                autoFocus
                            />
                        </View>
                    </View>
                )}

                {step === 4 && (
                    <View style={styles.stepContainer}>
                        <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
                            <Receipt color="#D97706" size={48} />
                        </View>
                        <Text style={[styles.title, { color: textColor }]}>{t('onboarding.monthlyCostsTitle')}</Text>
                        <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                            {t('onboarding.monthlyCostsSubtitle')}
                        </Text>

                        {/* Add cost form */}
                        <View style={[styles.costForm, { alignSelf: 'center', width: '90%' }]}>
                            <TextInput
                                style={[styles.costInput, { backgroundColor: inputBgColor, borderColor, color: textColor }]}
                                placeholder={t('onboarding.costDescription')}
                                placeholderTextColor={secondaryTextColor}
                                value={costDescription}
                                onChangeText={setCostDescription}
                            />
                            <View style={styles.costAmountRow}>
                                <TextInput
                                    style={[styles.costInput, styles.costAmountInput, { backgroundColor: inputBgColor, borderColor, color: textColor }]}
                                    placeholder={t('onboarding.costAmount')}
                                    placeholderTextColor={secondaryTextColor}
                                    value={costAmount}
                                    onChangeText={setCostAmount}
                                    keyboardType="numeric"
                                />
                                <TouchableOpacity
                                    style={[styles.addCostBtn, { backgroundColor: primaryColor }]}
                                    onPress={addMonthlyCost}
                                >
                                    <Plus color="#FFF" size={20} />
                                    <Text style={styles.addCostBtnText}>{t('onboarding.addCost')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Cost list */}
                        {monthlyCosts.length === 0 ? (
                            <Text style={[styles.noCosts, { color: secondaryTextColor }]}>
                                {t('onboarding.noCostsYet')}
                            </Text>
                        ) : (
                            <View style={[styles.costList, { alignSelf: 'center', width: '90%' }]}>
                                {monthlyCosts.map((cost, index) => (
                                    <View key={index} style={[styles.costItem, { backgroundColor: cardBg, borderColor }]}>
                                        <View style={styles.costItemLeft}>
                                            <Text style={[styles.costItemDesc, { color: textColor }]}>{cost.description}</Text>
                                            <Text style={[styles.costItemAmount, { color: primaryColor }]}>${cost.amount}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => removeMonthlyCost(index)} style={styles.deleteCostBtn}>
                                            <Trash2 color="#EF4444" size={18} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

            </ScrollView>

            <View style={[styles.footer, { paddingHorizontal: horizontalPadding }]}>
                <View style={styles.progressContainer}>
                    {[1, 2, 3, 4].map((val) => (
                        <View
                            key={val}
                            style={[
                                styles.progressDot,
                                { backgroundColor: val <= step ? primaryColor : borderColor }
                            ]}
                        />
                    ))}
                </View>

                {step === 4 ? (
                    <View style={styles.step4Buttons}>
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: primaryColor, opacity: saving ? 0.7 : 1 }]}
                            onPress={handleNext}
                            disabled={saving}
                        >
                            <Text style={styles.buttonText}>
                                {monthlyCosts.length > 0 ? t('onboarding.saveCosts') : t('onboarding.getStarted')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSkipCosts} style={styles.skipButton}>
                            <Text style={[styles.skipText, { color: secondaryTextColor }]}>
                                {t('onboarding.skip')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: primaryColor, opacity: saving ? 0.7 : 1 }]}
                        onPress={handleNext}
                        disabled={saving}
                    >
                        <Text style={styles.buttonText}>{t('onboarding.next')}</Text>
                        <ArrowRight color="#FFF" size={20} style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        overflow: 'hidden' as const,
    },
    scrollContent: {
        flexGrow: 1,
        paddingVertical: 24,
        justifyContent: 'center',
    },
    stepContainer: {
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        paddingHorizontal: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        width: '90%',
        height: 80,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 24,
    },
    currencySymbol: {
        fontSize: 36,
        fontWeight: '600',
        marginRight: 12,
    },
    largeInput: {
        flex: 1,
        fontSize: 36,
        fontWeight: '600',
        height: '100%',
    },
    // Monthly costs styles
    costForm: {
        gap: 12,
        marginBottom: 16,
    },
    costInput: {
        height: 52,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    costAmountRow: {
        flexDirection: 'row',
        gap: 10,
    },
    costAmountInput: {
        flex: 1,
    },
    addCostBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        borderRadius: 14,
        gap: 6,
    },
    addCostBtnText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    noCosts: {
        textAlign: 'center',
        fontSize: 15,
        marginTop: 8,
        fontStyle: 'italic',
    },
    costList: {
        gap: 8,
        marginTop: 8,
    },
    costItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
    },
    costItemLeft: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginRight: 12,
    },
    costItemDesc: {
        fontSize: 16,
        fontWeight: '500',
    },
    costItemAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
    deleteCostBtn: {
        padding: 6,
    },
    footer: {
        paddingVertical: 24,
        gap: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    progressDot: {
        width: 24,
        height: 6,
        borderRadius: 3,
    },
    button: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    step4Buttons: {
        gap: 12,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    skipText: {
        fontSize: 16,
        fontWeight: '500',
    },
});
