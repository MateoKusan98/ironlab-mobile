import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Trash, Plus, Warning, ForkKnife, Moon, Barbell } from 'phosphor-react-native';
import { CoachStackParamList } from '../../navigation/CoachTabs';
import { Card, Button, Dialog, KeyboardAwareScreen } from '../../components/ui';
import {
  planReviewService, PlanReviewDetail, EditExercisePayload,
} from '../../services/plan-review.service';
import { theme, palette, alpha } from '../../theme';
import { apiErrorMessage } from '../../utils/apiError';

type Nav = NativeStackNavigationProp<CoachStackParamList, 'PlanReviewDetail'>;
type Rt = RouteProp<CoachStackParamList, 'PlanReviewDetail'>;

/**
 * One drafted session, with everything needed to judge it: what the athlete reported
 * this morning, and what the AI wrote off the back of it.
 *
 * Edits are local until saved. Save and Approve are deliberately SEPARATE actions —
 * approving is the irreversible one (it is the moment the athlete can see the session),
 * and folding it into every field edit would make a typo a delivery.
 */

/** A numeric field that keeps its own text state so a half-typed "10" isn't clamped to 1. */
const NumField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  label: string;
  width?: number;
}> = ({ value, onChange, label, width = 52 }) => (
  <View style={{ width }}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.numInput}
      value={value}
      onChangeText={onChange}
      keyboardType="decimal-pad"
      accessibilityLabel={label}
      placeholder="—"
      placeholderTextColor={palette.gray[600]}
    />
  </View>
);

type EditRow = { name: string; sets: string; reps: string; weight: string; rpe: string; cue: string };

const toRow = (e: { name: string; sets: number; reps: number; weight: number; rpe?: number; cue?: string }): EditRow => ({
  name: e.name,
  sets: String(e.sets),
  reps: String(e.reps),
  weight: String(e.weight),
  rpe: e.rpe != null ? String(e.rpe) : '',
  cue: e.cue ?? '',
});

export const PlanReviewDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();

  const [detail, setDetail] = useState<PlanReviewDetail | null>(null);
  const [rows, setRows] = useState<EditRow[]>([]);
  const [coachNote, setCoachNote] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [violations, setViolations] = useState<string[]>([]);
  // Reject needs a typed reason. Deliberately a Dialog and not Alert.prompt: that API is
  // iOS-only, and on Android the reject button would silently do nothing.
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    planReviewService.detail(params.reviewId)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setRows((d.session.json?.exercises ?? []).map(toRow));
        setCoachNote(d.coachNote ?? '');
      })
      .catch((err) => Alert.alert(t('common.error'), apiErrorMessage(err, t('planReview.loadFailed'))))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.reviewId]);

  const patchRow = (i: number, field: keyof EditRow, value: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
    setDirty(true);
  };

  const removeRow = (i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
    setDirty(true);
  };

  const addRow = () => {
    setRows((prev) => [...prev, { name: '', sets: '3', reps: '8', weight: '0', rpe: '', cue: '' }]);
    setDirty(true);
  };

  /**
   * Rows → payload. Returns null with an alert when a row is unusable rather than
   * silently coercing it: a blank weight becoming 0kg would ship a bodyweight
   * prescription for a barbell movement.
   */
  const buildPayload = (): EditExercisePayload[] | null => {
    const out: EditExercisePayload[] = [];
    for (const [i, r] of rows.entries()) {
      const sets = parseInt(r.sets, 10);
      const reps = parseInt(r.reps, 10);
      const weight = parseFloat(r.weight);
      const rpe = r.rpe.trim() ? parseFloat(r.rpe) : undefined;
      if (!r.name.trim() || !Number.isFinite(sets) || !Number.isFinite(reps) || !Number.isFinite(weight)) {
        Alert.alert(t('planReview.incompleteTitle'), t('planReview.incompleteBody', { row: i + 1 }));
        return null;
      }
      out.push({
        name: r.name.trim(), sets, reps, weight,
        ...(rpe !== undefined && Number.isFinite(rpe) ? { rpe } : {}),
        ...(r.cue.trim() ? { cue: r.cue.trim() } : {}),
      });
    }
    return out;
  };

  const save = useCallback(async (): Promise<boolean> => {
    const exercises = buildPayload();
    if (!exercises) return false;
    setBusy(true);
    try {
      const res = await planReviewService.edit(params.reviewId, {
        focus: detail?.session.json?.focus,
        exercises,
        coachsCall: detail?.session.json?.coachsCall,
      });
      setViolations(res.violations);
      setDirty(false);
      if (res.republished) {
        Alert.alert(t('planReview.republishedTitle'), t('planReview.republishedBody'));
      }
      return true;
    } catch (err) {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('planReview.saveFailed')));
      return false;
    } finally {
      setBusy(false);
    }
  }, [rows, detail, params.reviewId]);

  const approve = async () => {
    // Save first when there are unsaved edits — approving publishes whatever the SERVER
    // holds, so approving with a dirty form would ship the version the coach just
    // changed away from.
    if (dirty && !(await save())) return;
    setBusy(true);
    try {
      await planReviewService.approve(params.reviewId, coachNote.trim() || undefined);
      navigation.goBack();
    } catch (err) {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('planReview.approveFailed')));
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (rejectReason.trim().length < 3) {
      Alert.alert(t('planReview.reasonRequiredTitle'), t('planReview.reasonRequiredBody'));
      return;
    }
    setBusy(true);
    try {
      const res = await planReviewService.reject(params.reviewId, rejectReason.trim());
      setRejectOpen(false);
      if (!res.replacementId) Alert.alert(t('planReview.noReplacementTitle'), t('planReview.noReplacementBody'));
      navigation.goBack();
    } catch (err) {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('planReview.rejectFailed')));
    } finally {
      setBusy(false);
    }
  };

  if (loading || !detail) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={palette.brand[500]} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const ci = detail.checkIn;
  const released = !!detail.releasedAt;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {detail.athlete?.name ?? t('planReview.anAthlete')}
        </Text>
        <Text style={styles.subtitle}>
          {detail.session.json?.focus ?? t('planReview.untitledSession')} · {detail.targetDate}
        </Text>
      </View>

      <KeyboardAwareScreen contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {released && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{t('planReview.alreadyReleased')}</Text>
          </View>
        )}

        {/* What the athlete reported. The reason this session says what it says. */}
        {ci?.submitted && (
          <Card style={styles.cardSpacing}>
            <View style={styles.cardHeaderRow}>
              <Moon size={16} weight="fill" color={palette.brand[400]} />
              <Text style={styles.cardLabel}>{t('planReview.theirCheckIn')}</Text>
            </View>
            <Text style={styles.checkInLine}>
              {[
                ci.sleepHours != null ? t('planReview.ciSleep', { hours: ci.sleepHours }) : null,
                ci.energyLevel != null ? t('planReview.ciEnergy', { level: ci.energyLevel }) : null,
                ci.sorenessLevel != null ? t('planReview.ciSoreness', { level: ci.sorenessLevel }) : null,
                ci.stressLevel != null ? t('planReview.ciStress', { level: ci.stressLevel }) : null,
              ].filter(Boolean).join('  ·  ')}
            </Text>
            {!!ci.sorenessAreas?.length && (
              <Text style={styles.checkInSore}>
                {t('planReview.ciSoreAreas', { areas: ci.sorenessAreas.join(', ') })}
              </Text>
            )}
            {ci.totals && (
              <View style={styles.foodRow}>
                <ForkKnife size={13} weight="fill" color={palette.gray[400]} />
                <Text style={styles.foodText}>
                  {t('planReview.ciFood', {
                    calories: Math.round(ci.totals.calories),
                    protein: Math.round(ci.totals.protein),
                  })}
                </Text>
              </View>
            )}
            {!!ci.note && <Text style={styles.checkInNote}>"{ci.note}"</Text>}
          </Card>
        )}

        {!!violations.length && (
          <Card style={[styles.cardSpacing, styles.violationCard]}>
            <View style={styles.cardHeaderRow}>
              <Warning size={16} weight="fill" color={palette.warning[500]} />
              <Text style={styles.cardLabel}>{t('planReview.violationsTitle')}</Text>
            </View>
            {violations.map((v, i) => <Text key={i} style={styles.violationText}>• {v}</Text>)}
            <Text style={styles.violationFooter}>{t('planReview.violationsFooter')}</Text>
          </Card>
        )}

        {/* The session itself, editable in place. */}
        <Card style={styles.cardSpacing}>
          <View style={styles.cardHeaderRow}>
            <Barbell size={16} weight="fill" color={palette.brand[400]} />
            <Text style={styles.cardLabel}>{t('planReview.theSession')}</Text>
          </View>

          {rows.map((r, i) => (
            <View key={i} style={styles.exRow}>
              <View style={styles.exHeader}>
                <TextInput
                  style={styles.nameInput}
                  value={r.name}
                  onChangeText={(v) => patchRow(i, 'name', v)}
                  placeholder={t('planReview.exerciseName')}
                  placeholderTextColor={palette.gray[600]}
                  accessibilityLabel={t('planReview.exerciseName')}
                />
                <TouchableOpacity
                  onPress={() => removeRow(i)}
                  accessibilityRole="button"
                  accessibilityLabel={t('planReview.removeExercise')}
                  style={styles.removeBtn}
                >
                  <Trash size={16} weight="bold" color={palette.error[400]} />
                </TouchableOpacity>
              </View>
              <View style={styles.numRow}>
                <NumField label={t('planReview.sets')} value={r.sets} onChange={(v) => patchRow(i, 'sets', v)} />
                <NumField label={t('planReview.reps')} value={r.reps} onChange={(v) => patchRow(i, 'reps', v)} />
                <NumField label={t('planReview.kg')} value={r.weight} onChange={(v) => patchRow(i, 'weight', v)} width={72} />
                <NumField label={t('planReview.rpe')} value={r.rpe} onChange={(v) => patchRow(i, 'rpe', v)} />
              </View>
              <TextInput
                style={styles.cueInput}
                value={r.cue}
                onChangeText={(v) => patchRow(i, 'cue', v)}
                placeholder={t('planReview.cuePlaceholder')}
                placeholderTextColor={palette.gray[600]}
                accessibilityLabel={t('planReview.cue')}
              />
            </View>
          ))}

          <TouchableOpacity onPress={addRow} style={styles.addBtn} accessibilityRole="button">
            <Plus size={14} weight="bold" color={palette.brand[400]} />
            <Text style={styles.addBtnText}>{t('planReview.addExercise')}</Text>
          </TouchableOpacity>
        </Card>

        {/* A line to the athlete, delivered with the session. */}
        <Card style={styles.cardSpacing}>
          <Text style={styles.cardLabel}>{t('planReview.noteToAthlete')}</Text>
          <TextInput
            style={styles.noteInput}
            value={coachNote}
            onChangeText={setCoachNote}
            multiline
            maxLength={500}
            placeholder={t('planReview.notePlaceholder')}
            placeholderTextColor={palette.gray[600]}
            accessibilityLabel={t('planReview.noteToAthlete')}
          />
        </Card>

        {dirty && (
          <Button
            label={t('planReview.saveChanges')}
            variant="outline"
            onPress={save}
            isLoading={busy}
            isFullWidth
            style={styles.actionSpacing}
          />
        )}

        {!released && (
          <>
            <Button
              label={t('planReview.approve')}
              onPress={approve}
              isLoading={busy}
              isFullWidth
              style={styles.actionSpacing}
            />
            <Button
              label={t('planReview.reject')}
              variant="outline"
              color="error"
              onPress={() => setRejectOpen(true)}
              disabled={busy}
              isFullWidth
              style={styles.actionSpacing}
            />
          </>
        )}
      </KeyboardAwareScreen>

      <Dialog
        visible={rejectOpen}
        title={t('planReview.rejectTitle')}
        description={t('planReview.rejectBody')}
        acceptLabel={t('planReview.rejectConfirm')}
        cancelLabel={t('common.cancel')}
        onClose={() => setRejectOpen(false)}
        onAccept={reject}
      >
        <TextInput
          style={styles.noteInput}
          value={rejectReason}
          onChangeText={setRejectReason}
          multiline
          maxLength={500}
          placeholder={t('planReview.rejectPlaceholder')}
          placeholderTextColor={palette.gray[600]}
          accessibilityLabel={t('planReview.rejectTitle')}
        />
      </Dialog>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.lg },
  title: { fontSize: 24, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing['5xl'] },
  cardSpacing: { marginBottom: theme.spacing.lg },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  cardLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text },

  banner: {
    padding: theme.spacing.md, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.lg,
    backgroundColor: alpha(palette.brand[500], 0.12),
  },
  bannerText: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },

  checkInLine: { fontSize: 13, color: theme.colors.text, lineHeight: 20 },
  checkInSore: { fontSize: 12, color: palette.warning[400], marginTop: 6 },
  checkInNote: { fontSize: 13, color: theme.colors.textSecondary, fontStyle: 'italic', marginTop: theme.spacing.md },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  foodText: { fontSize: 12, color: theme.colors.textTertiary },

  violationCard: { borderColor: alpha(palette.warning[500], 0.4), borderWidth: 1 },
  violationText: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
  violationFooter: { fontSize: 11, color: theme.colors.textTertiary, marginTop: theme.spacing.sm, fontStyle: 'italic' },

  exRow: {
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  nameInput: {
    flex: 1, fontSize: 15, fontWeight: '600', color: theme.colors.text, paddingVertical: 4,
  },
  removeBtn: { padding: 6 },
  numRow: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.sm },
  fieldLabel: {
    fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
    color: theme.colors.textTertiary, marginBottom: 2,
  },
  numInput: {
    fontSize: 15, color: theme.colors.text, paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  cueInput: { fontSize: 12, color: theme.colors.textSecondary, marginTop: theme.spacing.sm, paddingVertical: 2 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: theme.spacing.md, marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg, borderWidth: 1, borderStyle: 'dashed',
    borderColor: alpha(palette.brand[500], 0.4),
  },
  addBtnText: { fontSize: 13, fontWeight: '600', color: palette.brand[400] },

  noteInput: {
    minHeight: 68, textAlignVertical: 'top', fontSize: 14, color: theme.colors.text,
    backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.lg,
    borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  actionSpacing: { marginBottom: theme.spacing.md },
});
