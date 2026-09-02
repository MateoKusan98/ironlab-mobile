import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Moon, Minus, ThumbsUp, Fire, Lightning, ForkKnife, CheckCircle,
} from 'phosphor-react-native';
import { Card, Button, KeyboardAwareScreen } from '../../components/ui';
import { aiCoachService, CheckInView, CheckInPayload } from '../../services/ai-coach.service';
import { theme, palette, alpha } from '../../theme';
import { apiErrorMessage } from '../../utils/apiError';

/**
 * The athlete's daily report to their coach: how they slept, how recovered they feel,
 * what hurts — alongside the meals they have already logged for the day.
 *
 * The meals are READ-ONLY here and are not part of the submitted payload. They live in
 * the food log and are shown so the athlete can see what the coach will see; giving this
 * screen its own way to edit them would be a second door onto the same data, and the two
 * would disagree the first time one of them changed.
 *
 * Every field is optional. A check-in that cannot be sent because the athlete did not
 * weigh themselves is a check-in that stops being sent.
 */

const MOOD_VALUES = ['tired', 'neutral', 'good', 'great', 'elite'] as const;
const MOOD_ICONS: Record<string, React.ReactElement> = {
  tired:   <Moon size={22} weight="fill" color={palette.coolGray[500]} />,
  neutral: <Minus size={22} weight="bold" color={palette.coolGray[400]} />,
  good:    <ThumbsUp size={22} weight="fill" color={palette.brand[500]} />,
  great:   <Fire size={22} weight="fill" color={palette.error[500]} />,
  elite:   <Lightning size={22} weight="fill" color={palette.yellow[500]} />,
};

const SORENESS_AREAS = [
  'neck', 'shoulders', 'chest', 'upper_back', 'lower_back',
  'elbows', 'wrists', 'hips', 'glutes', 'quads', 'hamstrings', 'knees', 'calves', 'ankles',
] as const;

/** A 1–5 dot rating. The same shape the readiness check already uses for energy. */
const DotScale: React.FC<{
  value: number | null;
  onChange: (v: number) => void;
  label: string;
  activeColor?: string;
}> = ({ value, onChange, label, activeColor = palette.brand[500] }) => (
  <View style={styles.dotRow}>
    {[1, 2, 3, 4, 5].map((lvl) => (
      <TouchableOpacity
        key={lvl}
        onPress={() => onChange(lvl)}
        style={styles.dotWrap}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${lvl}`}
        accessibilityState={{ selected: lvl === value }}
      >
        <View
          style={[
            styles.dot,
            value != null && lvl <= value && { backgroundColor: activeColor, borderColor: activeColor },
          ]}
        />
      </TouchableOpacity>
    ))}
  </View>
);

export const DailyCheckInScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<CheckInView | null>(null);

  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [sorenessLevel, setSorenessLevel] = useState<number | null>(null);
  const [sorenessAreas, setSorenessAreas] = useState<string[]>([]);
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [bodyweight, setBodyweight] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    aiCoachService.getCheckIn()
      .then((v) => {
        if (cancelled) return;
        setView(v);
        // Pre-fill from an already-filed check-in so revising is editing, not retyping.
        if (v.sleepHours != null) setSleepHours(String(v.sleepHours));
        setSleepQuality(v.sleepQuality);
        setEnergyLevel(v.energyLevel);
        setMood(v.mood);
        setSorenessLevel(v.sorenessLevel);
        setSorenessAreas(v.sorenessAreas ?? []);
        setStressLevel(v.stressLevel);
        if (v.note) setNote(v.note);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggleArea = (area: string) =>
    setSorenessAreas((prev) => (prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]));

  const submit = async () => {
    setSaving(true);
    // Only send what was actually answered. A blank field must reach the coach as
    // "not reported", not as a zero they might read as a measurement.
    const parsedSleep = parseFloat(sleepHours);
    const parsedWeight = parseFloat(bodyweight);
    const payload: CheckInPayload = {
      ...(Number.isFinite(parsedSleep) ? { sleepHours: parsedSleep } : {}),
      ...(sleepQuality != null ? { sleepQuality } : {}),
      ...(energyLevel != null ? { energyLevel } : {}),
      ...(mood ? { mood } : {}),
      ...(sorenessLevel != null ? { sorenessLevel } : {}),
      ...(sorenessAreas.length ? { sorenessAreas } : {}),
      ...(stressLevel != null ? { stressLevel } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(Number.isFinite(parsedWeight) ? { bodyweight: parsedWeight } : {}),
    };

    try {
      const updated = await aiCoachService.submitCheckIn(payload);
      setView(updated);
      navigation.goBack();
    } catch (err: unknown) {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('checkIn.submitFailed')));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={palette.brand[500]} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const totals = view?.totals ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">{t('checkIn.title')}</Text>
        <Text style={styles.subtitle}>
          {view?.submitted ? t('checkIn.alreadySentSubtitle') : t('checkIn.subtitle')}
        </Text>
      </View>

      <KeyboardAwareScreen contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Today's food — read-only. Owned by the food log, shown here for context. */}
        <Card style={styles.cardSpacing}>
          <View style={styles.cardHeaderRow}>
            <ForkKnife size={18} weight="fill" color={palette.brand[500]} />
            <Text style={styles.cardLabel}>{t('checkIn.todaysFood')}</Text>
          </View>

          {totals ? (
            <>
              <Text style={styles.macroLine}>
                {t('checkIn.macroSummary', {
                  calories: Math.round(totals.calories),
                  protein: Math.round(totals.protein),
                  carbs: Math.round(totals.carbs),
                  fat: Math.round(totals.fat),
                })}
              </Text>
              {view!.meals.map((m) => (
                <View key={m.id} style={styles.mealRow}>
                  <Text style={styles.mealName} numberOfLines={1}>
                    {m.mealName ?? t('checkIn.unnamedMeal')}
                  </Text>
                  {m.calories != null && <Text style={styles.mealKcal}>{Math.round(m.calories)} kcal</Text>}
                </View>
              ))}
            </>
          ) : (
            /* Say nothing rather than something thin — no zeroed macro row. */
            <Text style={styles.emptyFood}>{t('checkIn.noMealsYet')}</Text>
          )}
        </Card>

        {/* Sleep */}
        <Card style={styles.cardSpacing}>
          <Text style={styles.cardLabel}>{t('checkIn.sleep')}</Text>
          <View style={styles.inlineRow}>
            <TextInput
              style={styles.numberInput}
              value={sleepHours}
              onChangeText={setSleepHours}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={palette.gray[500]}
              accessibilityLabel={t('checkIn.sleepHours')}
            />
            <Text style={styles.unit}>{t('checkIn.hours')}</Text>
          </View>
          <Text style={styles.subLabel}>{t('checkIn.sleepQuality')}</Text>
          <DotScale value={sleepQuality} onChange={setSleepQuality} label={t('checkIn.sleepQuality')} />
        </Card>

        {/* How they feel */}
        <Card style={styles.cardSpacing}>
          <Text style={styles.cardLabel}>{t('checkIn.howAreYouFeeling')}</Text>
          <View style={styles.moodRow}>
            {MOOD_VALUES.map((v) => (
              <TouchableOpacity
                key={v}
                accessibilityRole="button"
                accessibilityState={{ selected: mood === v }}
                style={[styles.moodBtn, mood === v && styles.moodBtnActive]}
                onPress={() => setMood(v)}
              >
                <View style={styles.moodEmoji}>{MOOD_ICONS[v]}</View>
                <Text style={[styles.moodName, mood === v && styles.moodNameActive]}>
                  {t(`session.moods.${v}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.subLabel}>{t('checkIn.energy')}</Text>
          <DotScale value={energyLevel} onChange={setEnergyLevel} label={t('checkIn.energy')} />
        </Card>

        {/* Recovery */}
        <Card style={styles.cardSpacing}>
          <Text style={styles.cardLabel}>{t('checkIn.soreness')}</Text>
          <DotScale
            value={sorenessLevel}
            onChange={setSorenessLevel}
            label={t('checkIn.soreness')}
            activeColor={palette.warning[500]}
          />
          <Text style={styles.subLabel}>{t('checkIn.whereItHurts')}</Text>
          <View style={styles.chipWrap}>
            {SORENESS_AREAS.map((area) => {
              const on = sorenessAreas.includes(area);
              return (
                <TouchableOpacity
                  key={area}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.chip, on && styles.chipActive]}
                  onPress={() => toggleArea(area)}
                >
                  <Text style={[styles.chipText, on && styles.chipTextActive]}>
                    {t(`checkIn.areas.${area}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.subLabel}>{t('checkIn.stress')}</Text>
          <DotScale
            value={stressLevel}
            onChange={setStressLevel}
            label={t('checkIn.stress')}
            activeColor={palette.warning[500]}
          />
        </Card>

        {/* Bodyweight + note */}
        <Card style={styles.cardSpacing}>
          <Text style={styles.cardLabel}>{t('checkIn.bodyweight')}</Text>
          <View style={styles.inlineRow}>
            <TextInput
              style={styles.numberInput}
              value={bodyweight}
              onChangeText={setBodyweight}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={palette.gray[500]}
              accessibilityLabel={t('checkIn.bodyweight')}
            />
            <Text style={styles.unit}>kg</Text>
          </View>

          <Text style={[styles.subLabel, { marginTop: theme.spacing.lg }]}>{t('checkIn.anythingElse')}</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={1000}
            placeholder={t('checkIn.notePlaceholder')}
            placeholderTextColor={palette.gray[500]}
            accessibilityLabel={t('checkIn.anythingElse')}
          />
        </Card>

        <Button
          label={view?.submitted ? t('checkIn.update') : t('checkIn.send')}
          onPress={submit}
          isLoading={saving}
          isFullWidth
          leftIcon={view?.submitted ? <CheckCircle size={18} weight="fill" color={palette.white} /> : undefined}
          style={styles.submit}
        />
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.lg },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing['4xl'] },
  cardSpacing: { marginBottom: theme.spacing.lg },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  cardLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  subLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase',
    color: theme.colors.textTertiary, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm,
  },

  macroLine: { fontSize: 14, color: theme.colors.text, fontWeight: '600', marginBottom: theme.spacing.md },
  mealRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  mealName: { flex: 1, fontSize: 13, color: theme.colors.textSecondary, marginRight: theme.spacing.md },
  mealKcal: { fontSize: 13, color: theme.colors.textTertiary },
  emptyFood: { fontSize: 13, color: theme.colors.textTertiary, lineHeight: 19 },

  inlineRow: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm },
  numberInput: {
    flex: 1, fontSize: 22, fontWeight: '700', color: theme.colors.text,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingVertical: 6,
  },
  unit: { fontSize: 13, color: theme.colors.textTertiary, paddingBottom: 10 },
  noteInput: {
    minHeight: 84, textAlignVertical: 'top', fontSize: 14, color: theme.colors.text,
    backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.lg,
    borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.md,
  },

  dotRow: { flexDirection: 'row', gap: theme.spacing.sm },
  dotWrap: { flex: 1, paddingVertical: 6 },
  dot: {
    height: 10, borderRadius: 5,
    backgroundColor: theme.colors.cardElevated,
    borderWidth: 1, borderColor: theme.colors.border,
  },

  moodRow: { flexDirection: 'row', gap: theme.spacing.xs },
  moodBtn: {
    flex: 1, alignItems: 'center', paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: 'transparent',
  },
  moodBtnActive: {
    backgroundColor: alpha(palette.brand[500], 0.12),
    borderColor: alpha(palette.brand[500], 0.4),
  },
  moodEmoji: { marginBottom: 4 },
  moodName: { fontSize: 10, color: theme.colors.textTertiary },
  moodNameActive: { color: theme.colors.text, fontWeight: '600' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.cardElevated,
    borderWidth: 1, borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: alpha(palette.warning[500], 0.15),
    borderColor: alpha(palette.warning[500], 0.45),
  },
  chipText: { fontSize: 12, color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.text, fontWeight: '600' },

  submit: { marginTop: theme.spacing.sm },
});
