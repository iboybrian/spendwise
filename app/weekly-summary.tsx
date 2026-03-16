import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ArrowLeft, Sparkles, TrendingUp, TrendingDown, Clock } from 'lucide-react-native';

export default function WeeklySummaryScreen() {
    const { profile } = useStore();
    const colorScheme = useColorScheme();
    const router = useRouter();

    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const isDark = colorScheme === 'dark';
    const bgColor = isDark ? '#121212' : '#F9FAFB';
    const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#111827';
    const secondaryText = isDark ? '#9CA3AF' : '#6B7280';
    const primaryColor = '#4F46E5';
    const borderColor = isDark ? '#333333' : '#E0E0E0';

    useEffect(() => {
        fetchLatestReport();
    }, []);

    const fetchLatestReport = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('weekly_reports')
                .select('*')
                .eq('user_id', profile?.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            // If no report found, data will be null (single() throws error on 0 rows unless wrapped, so handle it)
            if (error && error.code !== 'PGRST116') throw error;

            setReport(data || null);
        } catch (err: any) {
            console.log('Error fetching report', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: profile?.currency || 'USD'
        }).format(amount);
    };

    const currentBudget = profile?.weekly_budget || 0;
    const totalSpent = report ? Number(report.total_spent) : 0;
    const isOverBudget = totalSpent > currentBudget;

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ArrowLeft color={textColor} size={24} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: textColor }]}>Weekly Summary</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {loading ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={primaryColor} />
                        <Text style={[styles.loadingText, { color: secondaryText }]}>
                            Analyzing your spending...
                        </Text>
                    </View>
                ) : !report ? (
                    <View style={styles.emptyState}>
                        <View style={[styles.iconBoxLg, { backgroundColor: '#E0E7FF' }]}>
                            <Clock color={primaryColor} size={48} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: textColor }]}>
                            No Summaries Yet
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: secondaryText }]}>
                            Your AI summary will appear here at the end of the week once you log some expenses.
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconBox, { backgroundColor: '#E0E7FF' }]}>
                                    <Sparkles color={primaryColor} size={20} />
                                </View>
                                <Text style={[styles.cardTitle, { color: textColor }]}>
                                    Claude AI Insight
                                </Text>
                            </View>

                            <Text style={[styles.summaryText, { color: textColor }]}>
                                {report.summary_text}
                            </Text>

                            <Text style={[styles.dateRange, { color: secondaryText }]}>
                                For week: {report.week_start} to {report.week_end}
                            </Text>
                        </View>

                        <View style={styles.metricsRow}>
                            <View style={[styles.metricCard, { backgroundColor: cardBg }]}>
                                <View style={styles.metricHeader}>
                                    <Text style={[styles.metricLabel, { color: secondaryText }]}>Total Spent</Text>
                                    {isOverBudget ? (
                                        <TrendingUp color="#EF4444" size={20} />
                                    ) : (
                                        <TrendingDown color="#10B981" size={20} />
                                    )}
                                </View>
                                <Text style={[styles.metricValue, { color: isOverBudget ? '#EF4444' : textColor }]}>
                                    {formatCurrency(totalSpent)}
                                </Text>
                            </View>

                            <View style={[styles.metricCard, { backgroundColor: cardBg }]}>
                                <Text style={[styles.metricLabel, { color: secondaryText }]}>Weekly Budget</Text>
                                <Text style={[styles.metricValue, { color: textColor }]}>
                                    {formatCurrency(currentBudget)}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}
                            onPress={() => router.push('/(tabs)/history')}
                        >
                            <Text style={[styles.buttonText, { color: primaryColor }]}>
                                See Full History
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
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
    centerBox: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    iconBoxLg: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: '80%',
    },
    summaryCard: {
        padding: 24,
        borderRadius: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    summaryText: {
        fontSize: 16,
        lineHeight: 26,
        marginBottom: 24,
    },
    dateRange: {
        fontSize: 14,
        fontStyle: 'italic',
    },
    metricsRow: {
        flexDirection: 'row',
        marginBottom: 32,
        gap: 16,
    },
    metricCard: {
        flex: 1,
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    metricHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    metricLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    metricValue: {
        fontSize: 24,
        fontWeight: '800',
    },
    button: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
