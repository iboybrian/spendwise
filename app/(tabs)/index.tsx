import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, Modal, TextInput, Alert, Pressable,
  KeyboardAvoidingView, Platform, TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import {
  Plus, Coffee, Car, Film, Heart, ShoppingBag,
  Home as HomeIcon, Book, Package, X, ChevronDown, Check
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusEffect } from '@react-navigation/native';
import { MotiView } from 'moti';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  withTiming, interpolate
} from 'react-native-reanimated';

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Home', 'Education', 'Other'];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', GTQ: 'Q', CAD: 'CA$', BRL: 'R$', HNL: 'L',
  CRC: '₡', MXN: 'MX$', COP: 'COL$', PEN: 'S/', ARS: 'AR$', EUR: '€',
};

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#F97316', Transport: '#3B82F6', Entertainment: '#A855F7',
  Health: '#EF4444', Shopping: '#EC4899', Home: '#14B8A6',
  Education: '#6366F1', Other: '#6B7280',
};

const COLOR_PRESETS = [
  '#F97316', '#3B82F6', '#A855F7', '#EF4444', '#EC4899',
  '#14B8A6', '#6366F1', '#F59E0B', '#10B981', '#8B5CF6',
  '#06B6D4', '#E11D48', '#84CC16', '#F43F5E', '#0EA5E9',
];

const getCategoryIcon = (category: string, color: string) => {
  switch (category) {
    case 'Food': return <Coffee color={color} size={24} />;
    case 'Transport': return <Car color={color} size={24} />;
    case 'Entertainment': return <Film color={color} size={24} />;
    case 'Health': return <Heart color={color} size={24} />;
    case 'Shopping': return <ShoppingBag color={color} size={24} />;
    case 'Home': return <HomeIcon color={color} size={24} />;
    case 'Education': return <Book color={color} size={24} />;
    default: return <Package color={color} size={24} />;
  }
};

/* ─── Animated Pressable Button ─── */
function AnimatedPressable({ children, style, onPress, disabled, ...rest }: any) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(scale.value, [0.95, 1], [0.85, 1]),
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.95, { damping: 15, stiffness: 200 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 200 }); }}
        onPress={onPress}
        disabled={disabled}
        style={style}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { profile } = useStore();
  const router = useRouter();
  const colorScheme = useColorScheme();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklySpent, setWeeklySpent] = useState(0);
  const [todaySpent, setTodaySpent] = useState(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});

  // Quick-add modal state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAmount, setQuickAmount] = useState('');
  const [quickDescription, setQuickDescription] = useState('');
  const [quickCategory, setQuickCategory] = useState('Other');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Custom categories state
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customCatInput, setCustomCatInput] = useState('');
  const [showAddCustomCat, setShowAddCustomCat] = useState(false);
  const [customCategoryColors, setCustomCategoryColors] = useState<Record<string, string>>({});
  const [selectedCustomColor, setSelectedCustomColor] = useState(COLOR_PRESETS[0]);

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

  const handleAddCustomCategory = async () => {
    if (!customCatInput.trim()) return;
    const newCats = [...customCategories, customCatInput.trim()];
    setCustomCategories(newCats);
    const newColors = { ...customCategoryColors, [customCatInput.trim()]: selectedCustomColor };
    setCustomCategoryColors(newColors);
    setCustomCatInput('');
    setShowAddCustomCat(false);
    setSelectedCustomColor(COLOR_PRESETS[0]);
    if (profile?.id) {
        await AsyncStorage.setItem(`@custom_cats_${profile.id}`, JSON.stringify(newCats));
        await AsyncStorage.setItem(`@custom_cat_colors_${profile.id}`, JSON.stringify(newColors));
    }
  };

  const getCatColor = (cat: string) => CATEGORY_COLORS[cat] || customCategoryColors[cat] || '#6B7280';

  const CategoryPickerContent = ({ value, onChange, show, setShow }: any) => {
      const allCats = [...CATEGORIES, ...customCategories];
      return (
      <>
          <TouchableOpacity
              style={[styles.modalInput, styles.categoryDropdown, { backgroundColor: inputBgColor, borderColor }]}
              onPress={() => setShow(!show)}
          >
              <View style={styles.categoryDropdownRow}>
                  {getCategoryIcon(value, primaryColor)}
                  <Text style={[styles.categoryDropdownText, { color: textColor }]}>{t(`categories.${value.toLowerCase()}`, { defaultValue: value })}</Text>
              </View>
              <ChevronDown color={secondaryText} size={20} />
          </TouchableOpacity>
          {show && (
              <View style={[styles.pickerList, { backgroundColor: inputBgColor, borderColor, zIndex: 9999 }]}>
                  <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                      {allCats.map(cat => (
                          <TouchableOpacity
                              key={cat}
                              style={[styles.pickerItem, value === cat && { backgroundColor: isDark ? '#2D2D44' : '#E0E7FF' }]}
                              onPress={() => { onChange(cat); setShow(false); setShowAddCustomCat(false); }}
                          >
                              <View style={styles.categoryDropdownRow}>
                                  {getCategoryIcon(cat, value === cat ? primaryColor : secondaryText)}
                                  <Text style={[styles.pickerItemText, { color: value === cat ? primaryColor : textColor }]}>{t(`categories.${cat.toLowerCase()}`, { defaultValue: cat })}</Text>
                              </View>
                              {value === cat && <Check color={primaryColor} size={16} />}
                          </TouchableOpacity>
                      ))}
                      {!showAddCustomCat ? (
                          <TouchableOpacity
                              style={[styles.pickerItem, { marginTop: 8, borderTopWidth: 1, borderTopColor: borderColor }]}
                              onPress={() => setShowAddCustomCat(true)}
                          >
                              <View style={styles.categoryDropdownRow}>
                                  <Plus color={primaryColor} size={20} />
                                  <Text style={[styles.pickerItemText, { color: primaryColor }]}>{t('common.addCustom', { defaultValue: 'Agregar Personalizado'})}</Text>
                              </View>
                          </TouchableOpacity>
                      ) : (
                          <View style={[styles.pickerItem, { flexDirection: 'column', alignItems: 'stretch', marginTop: 8, borderTopWidth: 1, borderTopColor: borderColor }]}>
                              <TextInput
                                  style={{ color: textColor, height: 40, borderWidth: 1, borderColor, borderRadius: 8, paddingHorizontal: 8, marginBottom: 8 }}
                                  placeholder={t('common.newCategory', { defaultValue: 'Nueva Categoría' })}
                                  placeholderTextColor={secondaryText}
                                  value={customCatInput}
                                  onChangeText={setCustomCatInput}
                                  autoFocus
                              />
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                                  {COLOR_PRESETS.map(color => (
                                      <TouchableOpacity
                                          key={color}
                                          onPress={() => setSelectedCustomColor(color)}
                                          style={{
                                              width: 28, height: 28, borderRadius: 14,
                                              backgroundColor: color,
                                              borderWidth: selectedCustomColor === color ? 3 : 0,
                                              borderColor: '#FFF',
                                              shadowColor: selectedCustomColor === color ? color : 'transparent',
                                              shadowOffset: { width: 0, height: 0 },
                                              shadowOpacity: 0.6,
                                              shadowRadius: 4,
                                              elevation: selectedCustomColor === color ? 4 : 0,
                                          }}
                                      />
                                  ))}
                              </View>
                              <TouchableOpacity style={{ backgroundColor: primaryColor, borderRadius: 8, padding: 8, alignItems: 'center' }} onPress={handleAddCustomCategory}>
                                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('common.save')}</Text>
                              </TouchableOpacity>
                          </View>
                      )}
                  </ScrollView>
              </View>
          )}
      </>
      );
  };

  const { t } = useTranslation();
  const isDark = colorScheme === 'dark';
  const bgColor = isDark ? '#121212' : '#F9FAFB';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#111827';
  const secondaryText = isDark ? '#9CA3AF' : '#6B7280';
  const primaryColor = '#4F46E5';
  const inputBgColor = isDark ? '#2D2D44' : '#F3F4F6';
  const borderColor = isDark ? '#333333' : '#E0E0E0';
  const modalBg = isDark ? '#1A1A2E' : '#FFFFFF';

  // Re-fetch every time this tab is focused (picks up edits/deletes from Expenses tab)
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const weekStartStr = startOfWeek.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const allExpenses = data || [];

      const todayTotal = allExpenses
        .filter(e => e.date === todayStr)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const weeklyExpenses = allExpenses.filter(e => e.date >= weekStartStr);
      const weeklyTotal = weeklyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

      const breakdown: Record<string, number> = {};
      weeklyExpenses.forEach(e => {
        const cat = e.category || 'Other';
        breakdown[cat] = (breakdown[cat] || 0) + Number(e.amount);
      });

      setTodaySpent(todayTotal);
      setWeeklySpent(weeklyTotal);
      setCategoryBreakdown(breakdown);
      setExpenses(allExpenses.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSave = async () => {
    if (!quickAmount || isNaN(Number(quickAmount))) {
      Alert.alert(t('common.error'), t('errors.invalidAmount'));
      return;
    }
    if (!quickDescription.trim()) {
      Alert.alert(t('common.error'), t('errors.needDescription'));
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('expenses').insert({
        user_id: profile?.id,
        amount: parseFloat(quickAmount),
        description: quickDescription.trim(),
        category: quickCategory,
        category_confidence: 1,
        date: new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
      setQuickAmount(''); setQuickDescription(''); setQuickCategory('Other');
      setShowQuickAdd(false);
      fetchDashboardData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to save expense.');
    } finally {
      setIsSaving(false);
    }
  };

  const closeQuickAdd = () => {
    setShowQuickAdd(false);
    setQuickAmount(''); setQuickDescription(''); setQuickCategory('Other');
    setShowCategoryPicker(false);
  };

  const currentBudget = profile?.weekly_budget || 0;
  const totalRatio = weeklySpent / (currentBudget || 1);
  const isOverBudget = totalRatio > 1;

  const numberOfBars = Math.max(1, Math.ceil(totalRatio));
  const overflowBars: { ratio: number; label: string }[] = [];
  for (let i = 0; i < numberOfBars; i++) {
    const barRatio = Math.min(Math.max(totalRatio - i, 0), 1);
    if (i === 0) {
      overflowBars.push({ 
        ratio: barRatio, 
        label: isOverBudget 
          ? t('home.overBudgetBar') 
          : t('home.budgetUsedBar', { percent: Math.round(totalRatio * 100) }) 
      });
    } else {
      overflowBars.push({ 
        ratio: barRatio, 
        label: t('home.overflowBar', { percent: Math.round((totalRatio - i) * 100), week: i + 1 }) 
      });
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: profile?.currency || 'USD' }).format(amount);

  const firstName = profile?.full_name?.split(' ')[0] || 'User';
  const dateString = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ─── Header with fade-in ─── */}
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500 }}
          style={styles.header}
        >
          <View style={{ flexShrink: 1 }}>
            <Text style={[styles.greeting, { color: textColor }]} numberOfLines={1}>
              {t('home.greeting', { name: firstName })}
            </Text>
            <Text style={[styles.date, { color: secondaryText }]}>{dateString}</Text>
          </View>
          <AnimatedPressable
            style={[styles.summaryButton, { backgroundColor: isDark ? '#333' : '#E0E7FF' }]}
            onPress={() => router.push('/weekly-summary')}
          >
            <Book color={primaryColor} size={24} />
          </AnimatedPressable>
        </MotiView>

        {/* ─── Budget Card with slide-in ─── */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 100 }}
        >
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.cardTitle, { color: secondaryText }]}>{t('home.weeklyBudget')}</Text>
            <View style={styles.budgetRow}>
              <Text
                style={[styles.budgetAmount, { color: isOverBudget ? '#EF4444' : textColor }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(weeklySpent)}
              </Text>
              <Text
                style={[styles.budgetTotal, { color: secondaryText }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {' '}/ {formatCurrency(currentBudget)}
              </Text>
            </View>

            {/* Multi-bar overflow — category colors */}
            {overflowBars.map((bar, barIndex) => {
              const barFloor = currentBudget * barIndex;
              const barCeil = currentBudget * (barIndex + 1);
              let runningTotal = 0;
              const barSegments: { cat: string; width: number }[] = [];

              Object.entries(categoryBreakdown).forEach(([cat, amount]) => {
                const catStart = runningTotal;
                const catEnd = runningTotal + amount;
                runningTotal = catEnd;
                const overlapStart = Math.max(catStart, barFloor);
                const overlapEnd = Math.min(catEnd, barCeil);
                const overlap = Math.max(0, overlapEnd - overlapStart);
                if (overlap > 0 && currentBudget > 0) {
                  barSegments.push({ cat, width: (overlap / currentBudget) * 100 });
                }
              });

              return (
                <View key={barIndex} style={{ marginBottom: barIndex < overflowBars.length - 1 ? 10 : 0 }}>
                  <View style={styles.progressBarBg}>
                    {barSegments.map((seg, i) => (
                      <MotiView
                        key={`${seg.cat}-${i}`}
                        from={{ width: '0%' as any }}
                        animate={{ width: `${seg.width}%` as any }}
                        transition={{ type: 'timing', duration: 800, delay: 300 + barIndex * 200 }}
                        style={[styles.progressSegment, { backgroundColor: getCatColor(seg.cat) }]}
                      />
                    ))}
                  </View>
                  <Text style={[
                    styles.progressText,
                    { color: isOverBudget ? '#EF4444' : secondaryText, fontWeight: isOverBudget ? '700' : '400' }
                  ]}>
                    {bar.label}
                  </Text>
                </View>
              );
            })}

            {/* Category legend */}
            {Object.keys(categoryBreakdown).length > 0 && (
              <View style={styles.legendContainer}>
                {Object.entries(categoryBreakdown).map(([cat, amount]) => (
                  <View key={cat} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: getCatColor(cat) }]} />
                    <Text style={[styles.legendText, { color: secondaryText }]}>
                      {cat} {formatCurrency(amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </MotiView>

        {/* ─── Today's Spent (animated) ─── */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 200 }}
          style={styles.metricsRow}
        >
          <View style={[styles.metricCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.metricLabel, { color: secondaryText }]}>{t('home.todaySpent')}</Text>
            <Text style={[styles.metricValue, { color: textColor }]}>{formatCurrency(todaySpent)}</Text>
          </View>
        </MotiView>

        {/* ─── Recent Expenses (staggered) ─── */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{t('home.recentExpenses')}</Text>
            <AnimatedPressable onPress={() => router.push('/(tabs)/expenses')}>
              <Text style={{ color: primaryColor, fontWeight: '600' }}>{t('home.seeAll')}</Text>
            </AnimatedPressable>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} />
          ) : expenses.length === 0 ? (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 400 }}
            >
              <View style={[styles.emptyState, { backgroundColor: cardBg }]}>
                <Text style={[styles.emptyText, { color: secondaryText }]}>{t('home.emptyExpenses')}</Text>
              </View>
            </MotiView>
          ) : (
            expenses.map((expense, index) => (
              <MotiView
                key={expense.id || index}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400, delay: 300 + index * 100 }}
              >
                <AnimatedPressable style={[styles.expenseItem, { backgroundColor: cardBg }]}>
                  <View style={[styles.iconBox, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}>
                    {getCategoryIcon(expense.category, primaryColor)}
                  </View>
                  <View style={styles.expenseInfo}>
                    <Text style={[styles.expenseTitle, { color: textColor }]} numberOfLines={1}>
                      {expense.description}
                    </Text>
                    <Text style={[styles.expenseCategory, { color: secondaryText }]}>
                      {expense.category}
                    </Text>
                  </View>
                  <Text style={[styles.expenseAmount, { color: textColor }]} numberOfLines={1} adjustsFontSizeToFit>
                    -{formatCurrency(Number(expense.amount))}
                  </Text>
                </AnimatedPressable>
              </MotiView>
            ))
          )}
        </View>

      </ScrollView>

      {/* ─── Animated FAB ─── */}
      <MotiView
        from={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 150, delay: 600 }}
        style={styles.fabContainer}
      >
        <AnimatedPressable
          style={[styles.fab, { backgroundColor: primaryColor }]}
          onPress={() => setShowQuickAdd(true)}
        >
          <Plus color="#FFF" size={32} />
        </AnimatedPressable>
      </MotiView>

      {/* ─── Quick-Add Modal (slide-up) ─── */}
      <Modal
        visible={showQuickAdd}
        transparent
        animationType="slide"
        onRequestClose={closeQuickAdd}
      >
        <Pressable style={styles.modalOverlay} onPress={closeQuickAdd}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalCenter}
          >
            <Pressable style={[styles.modalCard, { backgroundColor: modalBg }]} onPress={() => {}}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textColor }]}>{t('home.quickExpense')}</Text>
                <AnimatedPressable onPress={closeQuickAdd} hitSlop={12}>
                  <X color={secondaryText} size={22} />
                </AnimatedPressable>
              </View>
              <Text style={[styles.modalSubtitle, { color: secondaryText }]}>
                {t('home.quickExpenseSubtitle')}
              </Text>

              {/* Amount */}
              <Text style={[styles.fieldLabel, { color: secondaryText }]}>{t('common.amount')}</Text>
              <View style={[styles.modalInput, { backgroundColor: inputBgColor, borderColor }]}>
                <Text style={[styles.currencyPrefix, { color: secondaryText }]}>
                  {CURRENCY_SYMBOLS[profile?.currency || 'USD'] || '$'}
                </Text>
                <TextInput
                  style={[styles.modalTextInput, { color: textColor }]}
                  placeholder="0.00"
                  placeholderTextColor={secondaryText}
                  value={quickAmount}
                  onChangeText={(text) => {
                    const filtered = text.replace(/[^0-9.]/g, '');
                    if (filtered.split('.').length <= 2) setQuickAmount(filtered);
                  }}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>

              {/* Description */}
              <Text style={[styles.fieldLabel, { color: secondaryText }]}>{t('common.description')}</Text>
              <View style={[styles.modalInput, { backgroundColor: inputBgColor, borderColor }]}>
                <TextInput
                  style={[styles.modalTextInput, { color: textColor }]}
                  placeholder="e.g. Coffee"
                  placeholderTextColor={secondaryText}
                  value={quickDescription}
                  onChangeText={setQuickDescription}
                />
              </View>

              {/* Category Dropdown */}
              <Text style={[styles.fieldLabel, { color: secondaryText }]}>{t('common.category')}</Text>
              <CategoryPickerContent value={quickCategory} onChange={setQuickCategory} show={showCategoryPicker} setShow={setShowCategoryPicker} />

              {/* Save Button */}
              <AnimatedPressable
                style={[styles.modalSaveButton, { backgroundColor: primaryColor, opacity: isSaving ? 0.7 : 1 }]}
                onPress={handleQuickSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalSaveText}>{t('home.saveExpense')}</Text>
                )}
              </AnimatedPressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 60, paddingBottom: 100 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
  },
  summaryButton: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  greeting: { fontSize: 28, fontWeight: '800' },
  date: { fontSize: 16, marginTop: 4 },
  card: {
    padding: 24, borderRadius: 24, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  budgetRow: {
    flexDirection: 'row', alignItems: 'baseline', marginTop: 8, marginBottom: 16,
    flexShrink: 1,
  },
  budgetAmount: { fontSize: 34, fontWeight: '800', flexShrink: 1, minWidth: 0 },
  budgetTotal: { fontSize: 16, fontWeight: '600', flexShrink: 1, minWidth: 0 },
  progressBarBg: { height: 14, backgroundColor: '#E5E7EB', borderRadius: 7, overflow: 'hidden', flexDirection: 'row' },
  progressSegment: { height: '100%' },
  progressText: { marginTop: 12, fontSize: 14 },
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
  legendText: { fontSize: 12, fontWeight: '500' },
  metricsRow: { flexDirection: 'row', marginBottom: 24 },
  metricCard: {
    flex: 1, padding: 20, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  metricLabel: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  metricValue: { fontSize: 24, fontWeight: '700' },
  recentSection: { marginTop: 8 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  emptyState: { padding: 32, borderRadius: 20, alignItems: 'center' },
  emptyText: { fontSize: 16 },
  expenseItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20,
    marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  expenseInfo: { flex: 1 },
  expenseTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  expenseCategory: { fontSize: 14 },
  expenseAmount: { fontSize: 18, fontWeight: '700', flexShrink: 1, minWidth: 0 },
  fabContainer: { position: 'absolute', bottom: 24, right: 24 },
  fab: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCenter: { width: '100%' },
  modalCard: {
    width: '100%', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  modalSubtitle: { fontSize: 14, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  modalInput: { flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16 },
  currencyPrefix: { fontSize: 18, fontWeight: '700', marginRight: 8 },
  modalTextInput: { flex: 1, fontSize: 16, height: '100%' },
  categoryDropdown: { justifyContent: 'space-between' },
  categoryDropdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryDropdownText: { fontSize: 16, fontWeight: '500' },
  pickerList: { borderRadius: 14, borderWidth: 1, marginTop: 6, overflow: 'hidden' },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  pickerItemText: { fontSize: 15, fontWeight: '500' },
  modalSaveButton: { height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  modalSaveText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
