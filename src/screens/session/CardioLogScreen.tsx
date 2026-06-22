import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { palette } from '../../theme';
import { sessionService } from '../../services/session.service';
import { useAuthStore } from '../../stores/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import {
  PersonSimpleRun, PersonSimpleWalk, Bicycle, ArrowsClockwise, Lightning,
  Stairs, PersonSimpleSwim, CheckCircle,
} from 'phosphor-react-native';

const ACTIVITY_MET: Record<string, number> = {
  walking:     3.5,
  treadmill:   7.0,
  running:     9.8,
  cycling:     7.5,
  swimming:    6.0,
  rowing:      7.0,
  hiit:        8.0,
  stairmaster: 9.0,
  elliptical:  5.0,
  jump_rope:   12.3,
  other:       6.0,
};

// ACSM metabolic formula for treadmill (returns kcal)
function estimateTreadmillCalories(speedKmh: number, inclinePct: number, durationMin: number, weightKg: number): number {
  const vMpm = speedKmh * (1000 / 60); // km/h → m/min
  const grade = inclinePct / 100;
  const vo2 = speedKmh <= 8
    ? 0.1 * vMpm + 1.8 * vMpm * grade + 3.5
    : 0.2 * vMpm + 0.9 * vMpm * grade + 3.5;
  const met = Math.max(1, vo2 / 3.5);
  return Math.round(met * weightKg * (durationMin / 60));
}

function estimateCalories(activityType: string, durationMin: number, weightKg: number, speedKmh?: number, inclinePct?: number): number {
  if (activityType === 'treadmill') {
    return estimateTreadmillCalories(speedKmh ?? 6, inclinePct ?? 0, durationMin, weightKg);
  }
  const met = ACTIVITY_MET[activityType] ?? 6.0;
  return Math.round(met * weightKg * (durationMin / 60));
}

const I18N_KEY: Record<string, string> = { jump_rope: 'jumpRope' };

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CardioLog'>;
};

const CARDIO_TYPE_ICONS = [
  { value: 'walking',     Icon: PersonSimpleWalk },
  { value: 'treadmill',   Icon: PersonSimpleRun },
  { value: 'running',     Icon: PersonSimpleRun },
  { value: 'cycling',     Icon: Bicycle },
  { value: 'swimming',    Icon: PersonSimpleSwim },
  { value: 'rowing',      Icon: ArrowsClockwise },
  { value: 'hiit',        Icon: Lightning },
  { value: 'stairmaster', Icon: Stairs },
  { value: 'elliptical',  Icon: Bicycle },
  { value: 'jump_rope',   Icon: PersonSimpleRun },
  { value: 'other',       Icon: PersonSimpleRun },
] as const;

export const CardioLogScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const weightKg = (() => {
    if (!user?.weight) return 70;
    if (user.weightUnit === 'lbs') return Math.round(user.weight * 0.453592);
    return user.weight;
  })();

  const CARDIO_TYPES = CARDIO_TYPE_ICONS.map((item) => ({
    ...item,
    label: t(`cardio.${I18N_KEY[item.value] ?? item.value}`),
  }));

  const [cardioType, setCardioType] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [caloriesIsAuto, setCaloriesIsAuto] = useState(false);
  const [distance, setDistance] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [speed, setSpeed] = useState('');
  const [incline, setIncline] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const isTreadmill = cardioType === 'treadmill';

  const recalcCalories = (type: string, dur: string, spd: string, inc: string) => {
    const dNum = parseInt(dur);
    if (!type || !(dNum > 0)) return;
    const sNum = spd ? parseFloat(spd) : undefined;
    const iNum = inc ? parseFloat(inc) : undefined;
    setCalories(String(estimateCalories(type, dNum, weightKg, sNum, iNum)));
  };

  useEffect(() => {
    if (!caloriesIsAuto) return;
    recalcCalories(cardioType, duration, speed, incline);
  }, [cardioType, duration, speed, incline, caloriesIsAuto, weightKg]);

  const handleActivitySelect = (value: string) => {
    setCardioType(value);
    if (value !== 'treadmill') { setSpeed(''); setIncline(''); }
    if (!calories || caloriesIsAuto) setCaloriesIsAuto(true);
  };

  const handleDurationChange = (val: string) => {
    setDuration(val);
    if (!calories || caloriesIsAuto) setCaloriesIsAuto(true);
  };

  const handleSpeedChange = (val: string) => {
    setSpeed(val);
    if (!calories || caloriesIsAuto) setCaloriesIsAuto(true);
  };

  const handleInclineChange = (val: string) => {
    setIncline(val);
    if (!calories || caloriesIsAuto) setCaloriesIsAuto(true);
  };

  const handleCaloriesChange = (val: string) => {
    setCalories(val);
    setCaloriesIsAuto(false);
  };

  const resetToEstimate = () => {
    setCaloriesIsAuto(true);
    recalcCalories(cardioType, duration, speed, incline);
  };

  const handleSave = async () => {
    if (!cardioType) {
      Alert.alert(t('cardio.selectActivityTitle'), t('cardio.selectActivityMsg'));
      return;
    }
    const durationNum = parseInt(duration);
    if (!durationNum || durationNum < 1) {
      Alert.alert(t('cardio.durationRequiredTitle'), t('cardio.durationRequiredMsg'));
      return;
    }

    setSaving(true);
    try {
      await sessionService.logCardio({
        date: today,
        cardioType,
        durationMinutes: durationNum,
        cardioCaloriesBurned: calories ? parseInt(calories) : undefined,
        cardioDistanceKm: distance ? parseFloat(distance) : undefined,
        cardioAvgHeartRate: heartRate ? parseInt(heartRate) : undefined,
        cardioSpeedKmh: speed ? parseFloat(speed) : undefined,
        cardioInclinePercent: incline ? parseFloat(incline) : undefined,
        notes: notes || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['nutritionSummary'] });
      navigation.goBack();
    } catch {
      Alert.alert(t('common.error'), t('cardio.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.backBtn} />
        <Text style={styles.title}>{t('cardio.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Activity type */}
          <Text style={styles.label}>{t('cardio.activity')}</Text>
          <View style={styles.typeGrid}>
            {CARDIO_TYPES.map((ct) => {
              const selected = cardioType === ct.value;
              return (
                <TouchableOpacity
                  key={ct.value}
                  style={[styles.typeCard, selected && styles.typeCardSelected]}
                  onPress={() => handleActivitySelect(ct.value)}
                >
                  <ct.Icon size={22} weight="bold" color={selected ? palette.brand[400] : palette.gray[500]} />
                  <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>{ct.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Duration */}
          <Text style={styles.label}>{t('cardio.durationMin')} <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={handleDurationChange}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor={palette.gray[600]}
            />
            <Text style={styles.unit}>min</Text>
          </View>

          {/* Treadmill: speed + incline */}
          {isTreadmill && (
            <>
              <View style={styles.treadmillRow}>
                <View style={styles.treadmillField}>
                  <Text style={styles.label}>{t('cardio.speed')} <Text style={styles.optional}>({t('common.optional')})</Text></Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={speed}
                      onChangeText={handleSpeedChange}
                      keyboardType="decimal-pad"
                      placeholder="6.0"
                      placeholderTextColor={palette.gray[600]}
                    />
                    <Text style={styles.unit}>km/h</Text>
                  </View>
                </View>
                <View style={styles.treadmillField}>
                  <Text style={styles.label}>{t('cardio.incline')} <Text style={styles.optional}>({t('common.optional')})</Text></Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={incline}
                      onChangeText={handleInclineChange}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={palette.gray[600]}
                    />
                    <Text style={styles.unit}>%</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.hint}>{t('cardio.treadmillHint')}</Text>
            </>
          )}

          {/* Calories burned */}
          <View style={styles.labelRow}>
            <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>
              {t('cardio.caloriesBurned')}{' '}
              {caloriesIsAuto
                ? <Text style={styles.estimateBadge}>~est.</Text>
                : <Text style={styles.optional}>({t('common.optional')})</Text>
              }
            </Text>
            {!caloriesIsAuto && cardioType && parseInt(duration) > 0 && (
              <TouchableOpacity onPress={resetToEstimate}>
                <Text style={styles.resetLink}>{t('cardio.resetToEstimate')}</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, caloriesIsAuto && styles.inputAuto]}
              value={calories}
              onChangeText={handleCaloriesChange}
              keyboardType="numeric"
              placeholder="—"
              placeholderTextColor={palette.gray[600]}
            />
            <Text style={styles.unit}>kcal</Text>
          </View>
          <Text style={styles.hint}>
            {caloriesIsAuto
              ? t(isTreadmill && (speed || incline)
                  ? 'cardio.estimatedCaloriesAcsm'
                  : 'cardio.estimatedCalories',
                { activity: cardioType || t('cardio.activity') })
              : t('cardio.caloriesHint')}
          </Text>

          {/* Distance */}
          <Text style={styles.label}>{t('cardio.distance')} <Text style={styles.optional}>({t('common.optional')})</Text></Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={distance}
              onChangeText={setDistance}
              keyboardType="decimal-pad"
              placeholder="5.0"
              placeholderTextColor={palette.gray[600]}
            />
            <Text style={styles.unit}>km</Text>
          </View>

          {/* Heart rate */}
          <Text style={styles.label}>{t('cardio.avgHeartRate')} <Text style={styles.optional}>({t('common.optional')})</Text></Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={heartRate}
              onChangeText={setHeartRate}
              keyboardType="numeric"
              placeholder="145"
              placeholderTextColor={palette.gray[600]}
            />
            <Text style={styles.unit}>bpm</Text>
          </View>

          {/* Notes */}
          <Text style={styles.label}>{t('cardio.notes')} <Text style={styles.optional}>({t('common.optional')})</Text></Text>
          <TextInput
            style={styles.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('cardio.notesPlaceholder')}
            placeholderTextColor={palette.gray[600]}
            multiline
            numberOfLines={3}
          />

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <CheckCircle size={20} weight="bold" color="#000" />
              <Text style={styles.saveBtnText}>{t('cardio.saveBtn')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090B' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  title: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  labelRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10, marginTop: 20 },
  label: { fontSize: 13, fontWeight: '700', color: palette.gray[300], marginBottom: 10, marginTop: 20 },
  required: { color: palette.brand[400] },
  optional: { color: palette.gray[600], fontWeight: '400' },
  estimateBadge: { color: palette.brand[400], fontWeight: '600', fontSize: 12 },
  resetLink: { color: palette.brand[400], fontSize: 12, fontWeight: '600' },
  inputAuto: { borderColor: palette.brand[700], color: palette.brand[300] },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '30%',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: palette.gray[900],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.gray[800],
    alignItems: 'center',
    gap: 6,
  },
  typeCardSelected: {
    borderColor: palette.brand[600],
    backgroundColor: 'rgba(234,88,12,0.1)',
  },
  typeLabel: { fontSize: 11, color: palette.gray[500], fontWeight: '600', textAlign: 'center' },
  typeLabelSelected: { color: palette.brand[400] },

  treadmillRow: { flexDirection: 'row', gap: 12 },
  treadmillField: { flex: 1 },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    flex: 1,
    backgroundColor: palette.gray[900],
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: palette.gray[700],
  },
  unit: { color: palette.gray[400], fontSize: 15, fontWeight: '600', width: 40 },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: palette.gray[600],
    fontStyle: 'italic',
    lineHeight: 17,
  },
  textArea: {
    backgroundColor: palette.gray[900],
    borderRadius: 12,
    padding: 14,
    color: '#FFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: palette.gray[700],
    minHeight: 80,
    textAlignVertical: 'top',
  },

  footer: { padding: 20, paddingBottom: 36 },
  saveBtn: {
    backgroundColor: palette.brand[500],
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
});
