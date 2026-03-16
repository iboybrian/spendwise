import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DollarSign, PieChart, ArrowRight, Check } from 'lucide-react-native';

export default function OnboardingScreen() {
    const [step, setStep] = useState(1);
    const [income, setIncome] = useState('');
    const [budget, setBudget] = useState('');
    const [saving, setSaving] = useState(false);
    const colorScheme = useColorScheme();
    const router = useRouter();
    const { profile, setProfile } = useStore();

    const isDark = colorScheme === 'dark';
    const backgroundColor = isDark ? '#121212' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#121212';
    const secondaryTextColor = isDark ? '#A0A0A0' : '#666666';
    const inputBgColor = isDark ? '#1E1E1E' : '#F5F5F5';
    const borderColor = isDark ? '#333333' : '#E0E0E0';
    const primaryColor = '#4F46E5'; // Indigo

    const handleNext = () => {
        if (step === 2 && !income) {
            Alert.alert('Income Required', 'Please enter your monthly income to continue.');
            return;
        }

        if (step === 2 && income) {
            // Suggest 25% for budget
            const parsedIncome = parseFloat(income);
            if (!isNaN(parsedIncome)) {
                setBudget((parsedIncome * 0.25).toFixed(0));
            }
        }

        if (step < 3) {
            setStep(step + 1);
        } else {
            handleFinish();
        }
    };

    const handleFinish = async () => {
        if (!budget) {
            Alert.alert('Budget Required', 'Please set a weekly budget.');
            return;
        }

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

            setProfile(data);
            router.replace('/(tabs)');

        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {step === 1 && (
                    <View style={styles.stepContainer}>
                        <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                            <PieChart color={primaryColor} size={48} />
                        </View>
                        <Text style={[styles.title, { color: textColor }]}>Welcome to SpendWise</Text>
                        <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                            Your intelligent personal expense tracker. Let's set up your profile to give you better insights and AI-driven weekly summaries.
                        </Text>
                    </View>
                )}

                {step === 2 && (
                    <View style={styles.stepContainer}>
                        <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                            <DollarSign color={primaryColor} size={48} />
                        </View>
                        <Text style={[styles.title, { color: textColor }]}>Monthly Income</Text>
                        <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                            What is your approximate monthly income? This helps us calculate a suggested budget for you.
                        </Text>

                        <View style={[styles.inputContainer, { backgroundColor: inputBgColor, borderColor }]}>
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
                        <Text style={[styles.title, { color: textColor }]}>Weekly Budget</Text>
                        <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                            Set your target weekly spending limit. We suggest about 25% of your monthly income.
                        </Text>

                        <View style={[styles.inputContainer, { backgroundColor: inputBgColor, borderColor }]}>
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

            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.progressContainer}>
                    {[1, 2, 3].map((val) => (
                        <View
                            key={val}
                            style={[
                                styles.progressDot,
                                { backgroundColor: val <= step ? primaryColor : borderColor }
                            ]}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: primaryColor, opacity: saving ? 0.7 : 1 }]}
                    onPress={handleNext}
                    disabled={saving}
                >
                    <Text style={styles.buttonText}>{step === 3 ? 'Get Started' : 'Next'}</Text>
                    {step < 3 && <ArrowRight color="#FFF" size={20} style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
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
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
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
    footer: {
        padding: 24,
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
});
