import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Modal, Pressable, TextInput, Alert, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
    Plus, Coffee, Car, Film, Heart, ShoppingBag,
    Home as HomeIcon, Book, Package, Trash2, X,
    ChevronDown, Check, RefreshCw, Zap, Pencil
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { PieChart } from 'react-native-gifted-charts';
import DropDownPicker from 'react-native-dropdown-picker';

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Home', 'Education', 'Other'];

const CATEGORY_COLORS: Record<string, string> = {
    Food: '#F97316', Transport: '#3B82F6', Entertainment: '#A855F7',
    Health: '#EF4444', Shopping: '#EC4899', Home: '#14B8A6',
    Education: '#6366F1', Other: '#6B7280',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$', GTQ: 'Q', CAD: 'CA$', BRL: 'R$', HNL: 'L',
    CRC: '₡', MXN: 'MX$', COP: 'COL$', PEN: 'S/', ARS: 'AR$', EUR: '€',
};

const getCategoryIcon = (category: string, color: string, size = 20) => {
    switch (category) {
        case 'Food': return <Coffee color={color} size={size} />;
        case 'Transport': return <Car color={color} size={size} />;
        case 'Entertainment': return <Film color={color} size={size} />;
        case 'Health': return <Heart color={color} size={size} />;
        case 'Shopping': return <ShoppingBag color={color} size={size} />;
        case 'Home': return <HomeIcon color={color} size={size} />;
        case 'Education': return <Book color={color} size={size} />;
        default: return <Package color={color} size={size} />;
    }
};

export default function ExpensesScreen() {
    const { profile } = useStore();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const { t } = useTranslation();

    const [expenses, setExpenses] = useState<any[]>([]);
    const [recurringExpenses, setRecurringExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Date slicer and chart state
    const [slicerRange, setSlicerRange] = useState<string>('This Week');
    const [summaryData, setSummaryData] = useState<any[]>([]);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);

    // DropDown states
    const [periodOpen, setPeriodOpen] = useState(false);
    const [periodItems, setPeriodItems] = useState([
        { label: t('periods.thisWeek'), value: 'This Week' },
        { label: t('periods.monthToDate'), value: 'Month to Date' },
        { label: t('periods.lastMonth'), value: 'Last Month' },
        { label: t('periods.yearToDate'), value: 'Year to Date' },
        { label: t('periods.customRange'), value: 'Custom Range' },
    ]);

    const [categoryOpen, setCategoryOpen] = useState(false);
    const [categoryItems, setCategoryItems] = useState([
        { label: t('categories.all'), value: 'All' },
        ...CATEGORIES.map(c => ({ label: t(`categories.${c.toLowerCase()}`), value: c }))
    ]);

    const [showCustomDateModal, setShowCustomDateModal] = useState(false);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // Add spontaneous expense modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [addAmount, setAddAmount] = useState('');
    const [addDescription, setAddDescription] = useState('');
    const [addCategory, setAddCategory] = useState('Other');
    const [showCatPicker, setShowCatPicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Add recurring expense modal
    const [showRecurringModal, setShowRecurringModal] = useState(false);
    const [recAmount, setRecAmount] = useState('');
    const [recDescription, setRecDescription] = useState('');
    const [recCategory, setRecCategory] = useState('Other');
    const [showRecCatPicker, setShowRecCatPicker] = useState(false);
    const [isSavingRec, setIsSavingRec] = useState(false);

    // Action sheet & Edit modal state
    const [selectedExpense, setSelectedExpense] = useState<any>(null);
    const [showActionSheet, setShowActionSheet] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editAmount, setEditAmount] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editCategory, setEditCategory] = useState('Other');
    const [showEditCatPicker, setShowEditCatPicker] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const isDark = colorScheme === 'dark';
    const bgColor = isDark ? '#121212' : '#F9FAFB';
    const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#111827';
    const secondaryText = isDark ? '#9CA3AF' : '#6B7280';
    const primaryColor = '#4F46E5';
    const borderColor = isDark ? '#333333' : '#E0E0E0';
    const inputBg = isDark ? '#2D2D44' : '#F3F4F6';
    const modalBg = isDark ? '#1A1A2E' : '#FFFFFF';

    useEffect(() => {
        setPeriodItems([
            { label: t('periods.thisWeek'), value: 'This Week' },
            { label: t('periods.monthToDate'), value: 'Month to Date' },
            { label: t('periods.lastMonth'), value: 'Last Month' },
            { label: t('periods.yearToDate'), value: 'Year to Date' },
            { label: t('periods.customRange'), value: 'Custom Range' },
        ]);
        setCategoryItems([
            { label: t('categories.all'), value: 'All' },
            ...CATEGORIES.map(c => ({ label: t(`categories.${c.toLowerCase()}`), value: c }))
        ]);
    }, [t]);

    useEffect(() => {
        fetchData();
        fetchSummary(slicerRange);
    }, [slicerRange]);

    const fetchSummary = useCallback(async (range: string) => {
        setIsSummaryLoading(true);
        try {
            let startDate = new Date();
            let endDate = new Date();
            
            if (range === 'This Week') {
                const day = startDate.getDay();
                const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); 
                startDate.setDate(diff);
            } else if (range === 'Month to Date') {
                startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            } else if (range === 'Last Month') {
                startDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
                endDate = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
            } else if (range === 'Year to Date') {
                startDate = new Date(startDate.getFullYear(), 0, 1);
            } else if (range === 'Custom Range') {
                if (customStart && customEnd) {
                    startDate = new Date(customStart);
                    endDate = new Date(customEnd);
                }
            }
            
            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];

            const { data, error } = await supabase.rpc('get_expense_summary', { start_date: startStr, end_date: endStr });
            if (error) throw error;
            
            setSummaryData(data || []);
        } catch (err) {
            console.error('Failed to fetch summary:', err);
        } finally {
            setIsSummaryLoading(false);
        }
    }, [profile?.id]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch recurring expenses
            const { data: recData } = await supabase
                .from('recurring_expenses')
                .select('*')
                .eq('user_id', profile?.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            setRecurringExpenses(recData || []);

            // Process recurring: generate daily entries for active recurring expenses
            if (recData && recData.length > 0) {
                await processRecurringExpenses(recData);
            }

            // Fetch all expenses
            const { data: expData } = await supabase
                .from('expenses')
                .select('*')
                .eq('user_id', profile?.id)
                .order('date', { ascending: false });

            setExpenses(expData || []);
        } catch (e) {
            console.error('Error fetching expenses:', e);
        } finally {
            setLoading(false);
        }
    }, [profile?.id]);

    // Process recurring expenses: create daily entries for today and any missed days
    const processRecurringExpenses = async (recurring: any[]) => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

        for (const rec of recurring) {
            const dailyAmount = Number(rec.amount) / daysInMonth;
            const createdDate = new Date(rec.created_at);
            const startStr = createdDate.toISOString().split('T')[0];

            // Check which days from creation to today already have entries
            const { data: existingEntries } = await supabase
                .from('expenses')
                .select('date')
                .eq('recurring_expense_id', rec.id)
                .gte('date', startStr)
                .lte('date', todayStr);

            const existingDates = new Set((existingEntries || []).map((e: any) => e.date));

            // Generate entries for missing days
            const missing: any[] = [];
            const cursor = new Date(Math.max(createdDate.getTime(), new Date(today.getFullYear(), today.getMonth(), 1).getTime()));

            while (cursor.toISOString().split('T')[0] <= todayStr) {
                const dateStr = cursor.toISOString().split('T')[0];
                if (!existingDates.has(dateStr) && dateStr >= startStr) {
                    missing.push({
                        user_id: profile?.id,
                        amount: Math.round(dailyAmount * 100) / 100,
                        description: rec.description,
                        category: rec.category,
                        category_confidence: 1,
                        date: dateStr,
                        recurring_expense_id: rec.id,
                    });
                }
                cursor.setDate(cursor.getDate() + 1);
            }

            if (missing.length > 0) {
                await supabase.from('expenses').insert(missing);
            }
        }
    };

    // Save spontaneous expense
    const handleSaveExpense = async () => {
        if (!addAmount || isNaN(Number(addAmount))) {
            Alert.alert(t('common.error'), t('errors.invalidAmount'));
            return;
        }
        if (!addDescription.trim()) {
            Alert.alert(t('common.error'), t('errors.needDescription'));
            return;
        }
        setIsSaving(true);
        try {
            const { error } = await supabase.from('expenses').insert({
                user_id: profile?.id,
                amount: parseFloat(addAmount),
                description: addDescription.trim(),
                category: addCategory,
                category_confidence: 1,
                date: new Date().toISOString().split('T')[0],
            });
            if (error) throw error;
            setAddAmount(''); setAddDescription(''); setAddCategory('Other');
            setShowAddModal(false);
            fetchData();
            fetchSummary(slicerRange);
        } catch (err: any) {
            Alert.alert(t('common.error'), err.message || 'Failed to save.');
        } finally {
            setIsSaving(false);
        }
    };

    // Save recurring expense
    const handleSaveRecurring = async () => {
        if (!recAmount || isNaN(Number(recAmount))) {
            Alert.alert(t('common.error'), t('errors.invalidAmount'));
            return;
        }
        if (!recDescription.trim()) {
            Alert.alert(t('common.error'), t('errors.needDescription'));
            return;
        }
        setIsSavingRec(true);
        try {
            const { error } = await supabase.from('recurring_expenses').insert({
                user_id: profile?.id,
                amount: parseFloat(recAmount),
                description: recDescription.trim(),
                category: recCategory,
            });
            if (error) throw error;
            setRecAmount(''); setRecDescription(''); setRecCategory('Other');
            setShowRecurringModal(false);
            fetchData();
        } catch (err: any) {
            Alert.alert(t('common.error'), err.message || 'Failed to save.');
        } finally {
            setIsSavingRec(false);
        }
    };

    // Deactivate recurring expense
    const deactivateRecurring = async (id: string, description: string) => {
        Alert.alert(
            t('expenses.removeRecurring'),
            t('expenses.removeRecurringMsg', { description }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'), style: 'destructive',
                    onPress: async () => {
                        await supabase.from('recurring_expenses').update({ is_active: false }).eq('id', id);
                        fetchData();
                    }
                }
            ]
        );
    };

    // Delete a single expense
    const deleteExpense = async (id: string) => {
        Alert.alert(t('expenses.deleteExpense'), t('expenses.deleteConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('common.delete'), style: 'destructive',
                onPress: async () => {
                    await supabase.from('expenses').delete().eq('id', id);
                    setShowActionSheet(false);
                    setSelectedExpense(null);
                    fetchData();
                    fetchSummary(slicerRange);
                }
            }
        ]);
    };

    // Open action sheet on long-press
    const handleExpenseLongPress = (expense: any) => {
        setSelectedExpense(expense);
        setShowActionSheet(true);
    };

    // Open edit modal
    const openEditModal = () => {
        if (!selectedExpense) return;
        setEditAmount(String(selectedExpense.amount));
        setEditDescription(selectedExpense.description || '');
        setEditCategory(selectedExpense.category || 'Other');
        setShowActionSheet(false);
        setShowEditModal(true);
    };

    // Save edited expense
    const handleSaveEdit = async () => {
        if (!editAmount || isNaN(Number(editAmount))) {
            Alert.alert(t('common.error'), t('errors.invalidAmount'));
            return;
        }
        if (!editDescription.trim()) {
            Alert.alert(t('common.error'), t('errors.needDescription'));
            return;
        }
        setIsUpdating(true);
        try {
            const { error } = await supabase.from('expenses')
                .update({
                    amount: parseFloat(editAmount),
                    description: editDescription.trim(),
                    category: editCategory,
                })
                .eq('id', selectedExpense.id);
            if (error) throw error;
            setShowEditModal(false);
            setSelectedExpense(null);
            fetchData();
            fetchSummary(slicerRange);
        } catch (err: any) {
            Alert.alert(t('common.error'), err.message || 'Failed to update.');
        } finally {
            setIsUpdating(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency', currency: profile?.currency || 'USD'
        }).format(amount);
    };

    // Group expenses by date
    const filteredExpenses = selectedCategory
        ? expenses.filter(e => e.category === selectedCategory)
        : expenses;

    const grouped: Record<string, any[]> = {};
    filteredExpenses.forEach(e => {
        const d = e.date;
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(e);
    });
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    // Reusable category picker modal content
    const CategoryPickerContent = ({ value, onChange, show, setShow }: any) => (
        <>
            <TouchableOpacity
                style={[styles.dropdownBtn, { backgroundColor: inputBg, borderColor }]}
                onPress={() => setShow(!show)}
            >
                <View style={styles.dropdownRow}>
                    {getCategoryIcon(value, primaryColor)}
                    <Text style={[styles.dropdownText, { color: textColor }]}>{value}</Text>
                </View>
                <ChevronDown color={secondaryText} size={20} />
            </TouchableOpacity>
            {show && (
                <View style={[styles.pickerList, { backgroundColor: inputBg, borderColor }]}>
                    <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.pickerItem, value === cat && { backgroundColor: isDark ? '#2D2D44' : '#E0E7FF' }]}
                                onPress={() => { onChange(cat); setShow(false); }}
                            >
                                <View style={styles.dropdownRow}>
                                    {getCategoryIcon(cat, value === cat ? primaryColor : secondaryText)}
                                    <Text style={[styles.pickerItemText, { color: value === cat ? primaryColor : textColor }]}>{cat}</Text>
                                </View>
                                {value === cat && <Check color={primaryColor} size={16} />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </>
    );

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
                    <Text style={[styles.headerTitle, { color: textColor }]}>{t('expenses.title')}</Text>
                </View>

                {/* ====== Filters ====== */}
                <View style={[styles.filtersContainer, { zIndex: 3000 }]}>
                    <View style={[styles.dropdownWrapper, { zIndex: 3000 }]}>
                        <DropDownPicker
                            open={periodOpen}
                            value={slicerRange}
                            items={periodItems}
                            setOpen={setPeriodOpen}
                            setValue={setSlicerRange}
                            setItems={setPeriodItems}
                            onChangeValue={(val) => {
                                if (val === 'Custom Range') setShowCustomDateModal(true);
                            }}
                            theme={isDark ? "DARK" : "LIGHT"}
                            style={{ backgroundColor: inputBg, borderColor }}
                            dropDownContainerStyle={{ backgroundColor: inputBg, borderColor }}
                            textStyle={{ color: textColor }}
                        />
                    </View>
                    <View style={[styles.dropdownWrapper, { zIndex: 2000, marginTop: 10 }]}>
                        <DropDownPicker
                            open={categoryOpen}
                            value={selectedCategory || 'All'}
                            items={categoryItems}
                            setOpen={setCategoryOpen}
                            setValue={(valOrCallback) => {
                                const val = typeof valOrCallback === 'function' ? valOrCallback(selectedCategory) : valOrCallback;
                                setSelectedCategory(val === 'All' ? null : val);
                            }}
                            setItems={setCategoryItems}
                            theme={isDark ? "DARK" : "LIGHT"}
                            style={{ backgroundColor: inputBg, borderColor }}
                            dropDownContainerStyle={{ backgroundColor: inputBg, borderColor }}
                            textStyle={{ color: textColor }}
                        />
                    </View>
                </View>

                {/* ====== Slicer & Chart ====== */}
                <View style={[styles.chartContainer, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>

                    <View style={styles.chartWrapper}>
                        {isSummaryLoading ? (
                            <ActivityIndicator size="large" color={primaryColor} />
                        ) : summaryData.length > 0 ? (
                            <View style={styles.chartRow}>
                                <View style={styles.chartCol}>
                                    <PieChart
                                        donut
                                        innerRadius={55}
                                        radius={75}
                                        data={summaryData.map(item => ({
                                            value: Number(item.total) || 0,
                                            color: CATEGORY_COLORS[item.category] || '#6B7280',
                                        }))}
                                        centerLabelComponent={() => {
                                            const total = summaryData.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
                                            return (
                                                <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 16, color: textColor, fontWeight: 'bold' }}>
                                                        {formatCurrency(total)}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: secondaryText }}>Total</Text>
                                                </View>
                                            );
                                        }}
                                    />
                                </View>
                                <View style={styles.legendCol}>
                                    <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
                                        {summaryData.map((item, idx) => {
                                            const totalAll = summaryData.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
                                            const val = Number(item.total) || 0;
                                            const perc = totalAll > 0 ? ((val / totalAll) * 100).toFixed(1) : '0';
                                            return (
                                                <View key={idx} style={styles.legendItem}>
                                                    <View style={[styles.legendColor, { backgroundColor: CATEGORY_COLORS[item.category] || '#6B7280' }]} />
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ color: textColor, fontSize: 13, fontWeight: '500' }}>
                                                            {t(`categories.${item.category.toLowerCase()}`, { defaultValue: item.category })}
                                                        </Text>
                                                        <Text style={{ color: secondaryText, fontSize: 11 }}>
                                                            {formatCurrency(val)} ({perc}%)
                                                        </Text>
                                                    </View>
                                                </View>
                                            )
                                        })}
                                    </ScrollView>
                                </View>
                            </View>
                        ) : (
                            <Text style={[{ color: secondaryText, textAlign: 'center', marginTop: 20 }]}>No data for this period.</Text>
                        )}
                    </View>
                </View>

                {/* ====== Quick Add Buttons ====== */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: primaryColor }]}
                        onPress={() => setShowAddModal(true)}
                    >
                        <Zap color="#FFF" size={18} />
                        <Text style={styles.actionBtnText}>{t('expenses.addExpense')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                        onPress={() => setShowRecurringModal(true)}
                    >
                        <RefreshCw color="#FFF" size={18} />
                        <Text style={styles.actionBtnText}>{t('expenses.addMonthly')}</Text>
                    </TouchableOpacity>
                </View>

                {/* ====== Active Recurring Expenses ====== */}
                {recurringExpenses.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: secondaryText }]}>{t('expenses.recurringTitle')}</Text>
                        <View style={[styles.card, { backgroundColor: cardBg }]}>
                            {recurringExpenses.map((rec, i) => {
                                const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
                                const dailyAmt = Number(rec.amount) / daysInMonth;
                                return (
                                    <View key={rec.id} style={[
                                        styles.recurringRow,
                                        i < recurringExpenses.length - 1 && { borderBottomWidth: 1, borderBottomColor: borderColor }
                                    ]}>
                                        <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[rec.category] || '#6B7280' }]} />
                                        <View style={styles.recurringInfo}>
                                            <Text style={[styles.recurringName, { color: textColor }]}>{rec.description}</Text>
                                            <Text style={[styles.recurringDetail, { color: secondaryText }]}>
                                                {formatCurrency(Number(rec.amount))}/mo · {formatCurrency(dailyAmt)}/day · {rec.category}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            hitSlop={12}
                                            onPress={() => deactivateRecurring(rec.id, rec.description)}
                                        >
                                            <Trash2 color="#EF4444" size={18} />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Category filters replaced by DropDownPicker */}

                {/* ====== Expense List ====== */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: secondaryText }]}>{t('expenses.recentTitle')}</Text>
                    {loading ? (
                        <ActivityIndicator style={{ marginTop: 20 }} />
                    ) : sortedDates.length === 0 ? (
                        <View style={[styles.emptyState, { backgroundColor: cardBg }]}>
                            <Text style={[styles.emptyText, { color: secondaryText }]}>{t('expenses.emptyExpenses')}</Text>
                        </View>
                    ) : (
                        sortedDates.map(date => (
                            <View key={date}>
                                <Text style={[styles.dateLabel, { color: secondaryText }]}>
                                    {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </Text>
                                {grouped[date].map((expense) => (
                                    <TouchableOpacity
                                        key={expense.id}
                                        style={[styles.expenseItem, { backgroundColor: cardBg }]}
                                        onLongPress={() => handleExpenseLongPress(expense)}
                                    >
                                        <View style={[styles.iconBox, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
                                            {getCategoryIcon(expense.category, CATEGORY_COLORS[expense.category] || primaryColor)}
                                        </View>
                                        <View style={styles.expenseInfo}>
                                            <Text style={[styles.expenseTitle, { color: textColor }]} numberOfLines={1}>
                                                {expense.description}
                                            </Text>
                                            <Text style={[styles.expenseCategory, { color: secondaryText }]}>
                                                {expense.category}
                                                {expense.recurring_expense_id ? ` · ${t('expenses.monthlyLabel')}` : ''}
                                            </Text>
                                        </View>
                                        <Text style={[styles.expenseAmount, { color: textColor }]}>
                                            -{formatCurrency(Number(expense.amount))}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* ====== CUSTOM DATE MODAL ====== */}
            <Modal visible={showCustomDateModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: modalBg }]}>
                        <Text style={[styles.modalTitle, { color: textColor, marginBottom: 16 }]}>{t('periods.customRange')}</Text>
                        
                        <Text style={[styles.fieldLabel, { color: secondaryText }]}>Start Date (YYYY-MM-DD)</Text>
                        <View style={[styles.modalInput, { backgroundColor: inputBg, borderColor, marginBottom: 12 }]}>
                            <TextInput
                                style={[styles.modalTextInput, { color: textColor }]}
                                placeholder="2024-01-01" placeholderTextColor={secondaryText}
                                value={customStart} onChangeText={setCustomStart}
                            />
                        </View>

                        <Text style={[styles.fieldLabel, { color: secondaryText }]}>End Date (YYYY-MM-DD)</Text>
                        <View style={[styles.modalInput, { backgroundColor: inputBg, borderColor }]}>
                            <TextInput
                                style={[styles.modalTextInput, { color: textColor }]}
                                placeholder="2024-12-31" placeholderTextColor={secondaryText}
                                value={customEnd} onChangeText={setCustomEnd}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: primaryColor }]}
                            onPress={() => {
                                setShowCustomDateModal(false);
                                fetchSummary('Custom Range');
                            }}
                        >
                            <Text style={styles.saveBtnText}>{t('common.save')}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setShowCustomDateModal(false)}>
                            <Text style={{ color: secondaryText, fontSize: 16 }}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ====== ADD SPONTANEOUS EXPENSE MODAL ====== */}
            <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => { setShowAddModal(false); setShowCatPicker(false); }}>
                    <Pressable style={[styles.modalCard, { backgroundColor: modalBg }]} onPress={() => setShowCatPicker(false)}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>{t('expenses.addExpense')}</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}><X color={secondaryText} size={22} /></TouchableOpacity>
                        </View>

                        <Text style={[styles.fieldLabel, { color: secondaryText }]}>{t('common.amount')}</Text>
                        <View style={[styles.modalInput, { backgroundColor: inputBg, borderColor }]}>
                            <Text style={[styles.currencyPfx, { color: secondaryText }]}>{CURRENCY_SYMBOLS[profile?.currency || 'USD'] || '$'}</Text>
                            <TextInput
                                style={[styles.modalTextInput, { color: textColor }]}
                                placeholder="0.00" placeholderTextColor={secondaryText}
                                value={addAmount} keyboardType="decimal-pad" autoFocus
                                onChangeText={t => { const f = t.replace(/[^0-9.]/g, ''); if (f.split('.').length <= 2) setAddAmount(f); }}
                            />
                        </View>

                        <Text style={[styles.fieldLabel, { color: secondaryText }]}>{t('common.description')}</Text>
                        <View style={[styles.modalInput, { backgroundColor: inputBg, borderColor }]}>
                            <TextInput
                                style={[styles.modalTextInput, { color: textColor }]}
                                placeholder="e.g. Coffee" placeholderTextColor={secondaryText}
                                value={addDescription} onChangeText={setAddDescription}
                            />
                        </View>

                        <Text style={[styles.fieldLabel, { color: secondaryText }]}>{t('common.category')}</Text>
                        <CategoryPickerContent value={addCategory} onChange={setAddCategory} show={showCatPicker} setShow={setShowCatPicker} />

                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: primaryColor, opacity: isSaving ? 0.7 : 1 }]}
                            onPress={handleSaveExpense} disabled={isSaving}
                        >
                            {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{t('expenses.addExpense')}</Text>}
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ====== ADD RECURRING EXPENSE MODAL ====== */}
            <Modal visible={showRecurringModal} transparent animationType="slide" onRequestClose={() => setShowRecurringModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => { setShowRecurringModal(false); setShowRecCatPicker(false); }}>
                    <Pressable style={[styles.modalCard, { backgroundColor: modalBg }]} onPress={() => setShowRecCatPicker(false)}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>{t('expenses.modalRecurringTitle')}</Text>
                            <TouchableOpacity onPress={() => setShowRecurringModal(false)}><X color={secondaryText} size={22} /></TouchableOpacity>
                        </View>
                        <Text style={[styles.modalSubtitle, { color: secondaryText }]}>
                            {t('expenses.modalRecurringSubtitle')}
                        </Text>

                        <Text style={[styles.fieldLabel, { color: secondaryText }]}>{t('expenses.monthlyAmount')}</Text>
                        <View style={[styles.modalInput, { backgroundColor: inputBg, borderColor }]}>
                            <Text style={[styles.currencyPfx, { color: secondaryText }]}>{CURRENCY_SYMBOLS[profile?.currency || 'USD'] || '$'}</Text>
                            <TextInput
                                style={[styles.modalTextInput, { color: textColor }]}
                                placeholder="0.00" placeholderTextColor={secondaryText}
                                value={recAmount} keyboardType="decimal-pad" autoFocus
                                onChangeText={t => { const f = t.replace(/[^0-9.]/g, ''); if (f.split('.').length <= 2) setRecAmount(f); }}
                            />
                        </View>

                        <Text style={[styles.fieldLabel, { color: secondaryText }]}>{t('common.description')}</Text>
                        <View style={[styles.modalInput, { backgroundColor: inputBg, borderColor }]}>
                            <TextInput
                                style={[styles.modalTextInput, { color: textColor }]}
                                placeholder="e.g. Netflix, Rent, Internet" placeholderTextColor={secondaryText}
                                value={recDescription} onChangeText={setRecDescription}
                            />
                        </View>

                        <Text style={[styles.fieldLabel, { color: secondaryText }]}>{t('common.category')}</Text>
                        <CategoryPickerContent value={recCategory} onChange={setRecCategory} show={showRecCatPicker} setShow={setShowRecCatPicker} />

                        {recAmount && !isNaN(Number(recAmount)) && (
                            <View style={[styles.previewBox, { backgroundColor: inputBg }]}>
                                <Text style={[styles.previewText, { color: primaryColor }]}>
                                    ≈ {formatCurrency(Number(recAmount) / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())} / day
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: '#10B981', opacity: isSavingRec ? 0.7 : 1 }]}
                            onPress={handleSaveRecurring} disabled={isSavingRec}
                        >
                            {isSavingRec ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{t('expenses.addMonthly')}</Text>}
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ====== ACTION SHEET MODAL ====== */}
            <Modal visible={showActionSheet} transparent animationType="fade" onRequestClose={() => setShowActionSheet(false)}>
                <Pressable style={styles.actionOverlay} onPress={() => setShowActionSheet(false)}>
                    <View style={[styles.actionSheet, { backgroundColor: modalBg }]}>
                        <Text style={[styles.actionTitle, { color: secondaryText }]}>
                            {selectedExpense?.description}
                        </Text>
                        <TouchableOpacity style={styles.actionOption} onPress={openEditModal}>
                            <Pencil color={primaryColor} size={20} />
                            <Text style={[styles.actionOptionText, { color: textColor }]}>{t('common.edit')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionOption} onPress={() => selectedExpense && deleteExpense(selectedExpense.id)}>
                            <Trash2 color="#EF4444" size={20} />
                            <Text style={[styles.actionOptionText, { color: '#EF4444' }]}>{t('common.delete')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionCancel, { backgroundColor: inputBg }]}
                            onPress={() => setShowActionSheet(false)}
                        >
                            <Text style={[styles.actionCancelText, { color: textColor }]}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            {/* ====== EDIT EXPENSE MODAL ====== */}
            <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => { setShowEditModal(false); setShowEditCatPicker(false); }}>
                    <Pressable style={[styles.modalCard, { backgroundColor: modalBg }]} onPress={() => setShowEditCatPicker(false)}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>{t('expenses.editExpense')}</Text>
                            <TouchableOpacity onPress={() => setShowEditModal(false)}><X color={secondaryText} size={22} /></TouchableOpacity>
                        </View>

                        <Text style={[styles.fieldLabel, { color: secondaryText }]}>{t('common.amount')}</Text>
                        <View style={[styles.modalInput, { backgroundColor: inputBg, borderColor }]}>
                            <Text style={[styles.currencyPfx, { color: secondaryText }]}>{CURRENCY_SYMBOLS[profile?.currency || 'USD'] || '$'}</Text>
                            <TextInput
                                style={[styles.modalTextInput, { color: textColor }]}
                                placeholder="0.00" placeholderTextColor={secondaryText}
                                value={editAmount} keyboardType="decimal-pad"
                                onChangeText={t => { const f = t.replace(/[^0-9.]/g, ''); if (f.split('.').length <= 2) setEditAmount(f); }}
                            />
                        </View>

                        <Text style={[styles.fieldLabel, { color: secondaryText }]}>{t('common.description')}</Text>
                        <View style={[styles.modalInput, { backgroundColor: inputBg, borderColor }]}>
                            <TextInput
                                style={[styles.modalTextInput, { color: textColor }]}
                                placeholder="e.g. Coffee" placeholderTextColor={secondaryText}
                                value={editDescription} onChangeText={setEditDescription}
                            />
                        </View>

                        <Text style={[styles.fieldLabel, { color: secondaryText }]}>{t('common.category')}</Text>
                        <CategoryPickerContent value={editCategory} onChange={setEditCategory} show={showEditCatPicker} setShow={setShowEditCatPicker} />

                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: primaryColor, opacity: isUpdating ? 0.7 : 1 }]}
                            onPress={handleSaveEdit} disabled={isUpdating}
                        >
                            {isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{t('expenses.saveChanges')}</Text>}
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    header: { paddingTop: 60, paddingBottom: 16, alignItems: 'center', borderBottomWidth: 1 },
    headerTitle: { fontSize: 20, fontWeight: '700' },

    chartContainer: { paddingBottom: 20, borderBottomWidth: 1 },
    chartWrapper: { alignItems: 'center', justifyContent: 'center', marginTop: 20, minHeight: 200 },

    filtersContainer: { paddingHorizontal: 20, marginTop: 20, marginBottom: 10, position: 'relative' },
    dropdownWrapper: { position: 'relative' },

    chartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 10 },
    chartCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    legendCol: { flex: 1, paddingLeft: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    legendColor: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },

    actionButtons: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 20 },
    actionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, height: 48, borderRadius: 14,
    },
    actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

    section: { paddingHorizontal: 20, marginTop: 20 },
    sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 1, marginBottom: 10 },
    card: {
        borderRadius: 20, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    recurringRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    catDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    recurringInfo: { flex: 1 },
    recurringName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
    recurringDetail: { fontSize: 13 },

    filterBar: { paddingHorizontal: 20, marginTop: 20, marginBottom: 4 },
    filterChip: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        marginRight: 8, backgroundColor: 'transparent',
    },
    filterText: { fontSize: 14, fontWeight: '600' },

    dateLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginTop: 16, marginBottom: 8, paddingHorizontal: 20 },
    expenseItem: {
        flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16,
        marginBottom: 8, marginHorizontal: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
    },
    iconBox: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    expenseInfo: { flex: 1 },
    expenseTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
    expenseCategory: { fontSize: 13 },
    expenseAmount: { fontSize: 16, fontWeight: '700' },
    emptyState: { padding: 32, borderRadius: 20, alignItems: 'center', marginHorizontal: 20 },
    emptyText: { fontSize: 16 },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: {
        width: '100%', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    modalTitle: { fontSize: 20, fontWeight: '800' },
    modalSubtitle: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
    fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
    modalInput: { flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
    currencyPfx: { fontSize: 17, fontWeight: '700', marginRight: 8 },
    modalTextInput: { flex: 1, fontSize: 16, height: '100%' },
    dropdownBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        height: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14,
    },
    dropdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dropdownText: { fontSize: 15, fontWeight: '500' },
    pickerList: { borderRadius: 14, borderWidth: 1, marginTop: 6, overflow: 'hidden' },
    pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
    pickerItemText: { fontSize: 14, fontWeight: '500' },
    previewBox: { marginTop: 12, padding: 12, borderRadius: 12, alignItems: 'center' },
    previewText: { fontSize: 16, fontWeight: '700' },
    saveBtn: { height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 18 },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

    // Action Sheet
    actionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    actionSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
    actionTitle: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
    actionOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 8 },
    actionOptionText: { fontSize: 17, fontWeight: '600' },
    actionCancel: { marginTop: 10, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    actionCancelText: { fontSize: 16, fontWeight: '700' },
});
