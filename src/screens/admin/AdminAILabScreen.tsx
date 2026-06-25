import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { adminAiService, AdminUserEntry, AdminUserState } from '../../services/ai-coach.service';
import { KeyboardAwareScreen } from '../../components/ui';
import { palette, theme } from '../../theme';

type RouteProps = RouteProp<RootStackParamList, 'AdminAILab'>;

const PHASES = ['accumulation', 'intensification', 'peaking', 'deload'];
const FATIGUE_LEVELS = ['none', 'mild', 'elevated', 'high'] as const;
type FatigueLevel = typeof FATIGUE_LEVELS[number];

const PHASE_COLORS: Record<string, string> = {
  accumulation:   palette.brand[400],
  intensification: palette.warning[400],
  peaking:        palette.error[400],
  deload:         palette.success[400],
};
const FATIGUE_COLORS: Record<string, string> = {
  none:     palette.success[400],
  mild:     palette.brand[400],
  elevated: palette.warning[400],
  high:     palette.error[400],
};

function PhaseBar({ week, total, phase }: { week: number; total: number; phase: string }) {
  const pct = Math.min(week / total, 1);
  const color = PHASE_COLORS[phase] ?? palette.brand[400];
  return (
    <View style={phasebar.track}>
      <View style={[phasebar.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      <Text style={[phasebar.label, { color }]}>{`Wk ${week}/${total}`}</Text>
    </View>
  );
}

const phasebar = StyleSheet.create({
  track: { height: 6, backgroundColor: palette.gray[800], borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 3, position: 'absolute', left: 0 },
  label: { fontSize: 10, fontWeight: '700', textAlign: 'right', marginTop: 2 },
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, accent ? { color: accent } : undefined]}>{value}</Text>
    </View>
  );
}

function Btn({
  label, onPress, color, outline, loading, small,
}: {
  label: string; onPress: () => void; color?: string; outline?: boolean; loading?: boolean; small?: boolean;
}) {
  const bg = color ?? palette.brand[600];
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        small && styles.btnSmall,
        outline ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: bg } : { backgroundColor: bg },
      ]}
      onPress={onPress}
      disabled={loading}
    >
      {loading
        ? <ActivityIndicator size="small" color="#fff" />
        : <Text style={[styles.btnText, outline && { color: bg }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

function ChipRow<T extends string>({
  options, selected, onSelect, colorMap,
}: {
  options: readonly T[]; selected: T | null; onSelect: (v: T) => void; colorMap?: Record<string, string>;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = selected === opt;
        const color = colorMap?.[opt] ?? palette.brand[400];
        return (
          <TouchableOpacity
            key={opt}
            style={[
              styles.chip,
              active ? { backgroundColor: color + '33', borderColor: color } : { borderColor: palette.gray[700] },
            ]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.chipText, active && { color }]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Debug Prompt Modal ────────────────────────────────────────────────────

function DebugModal({
  visible, onClose, userId,
}: { visible: boolean; onClose: () => void; userId: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ systemPrompt: string; userMessage: string; layers: Record<string, string | null> } | null>(null);
  const [tab, setTab] = useState<'system' | 'user' | 'layers'>('layers');

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    adminAiService.getDebugPrompt(userId)
      .then(setData)
      .catch(() => Alert.alert('Error', 'Could not fetch debug prompt'))
      .finally(() => setLoading(false));
  }, [visible, userId]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
        <View style={debug.header}>
          <Text style={debug.title}>Debug Prompt</Text>
          <TouchableOpacity onPress={onClose}><Text style={debug.close}>✕</Text></TouchableOpacity>
        </View>
        <View style={debug.tabs}>
          {(['layers', 'system', 'user'] as const).map((t) => (
            <TouchableOpacity key={t} style={[debug.tab, tab === t && debug.tabActive]} onPress={() => setTab(t)}>
              <Text style={[debug.tabText, tab === t && debug.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {loading
          ? <ActivityIndicator color={palette.brand[400]} style={{ marginTop: 40 }} />
          : (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {tab === 'layers' && data && Object.entries(data.layers).map(([k, v]) => (
                <View key={k} style={debug.layer}>
                  <Text style={debug.layerKey}>{k}</Text>
                  <Text style={debug.layerVal}>{v ?? '(empty)'}</Text>
                </View>
              ))}
              {tab === 'system' && data && (
                <Text style={debug.code}>{data.systemPrompt}</Text>
              )}
              {tab === 'user' && data && (
                <Text style={debug.code}>{data.userMessage}</Text>
              )}
            </ScrollView>
          )}
      </SafeAreaView>
    </Modal>
  );
}

const debug = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: palette.gray[800] },
  title:  { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  close:  { fontSize: 22, color: palette.gray[400] },
  tabs:   { flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.gray[800] },
  tab:    { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: palette.gray[900], borderWidth: 1, borderColor: palette.gray[700] },
  tabActive: { backgroundColor: palette.brand[600] + '33', borderColor: palette.brand[500] },
  tabText: { fontSize: 12, color: palette.gray[400] },
  tabTextActive: { color: palette.brand[300], fontWeight: '600' },
  layer:  { marginBottom: 14, backgroundColor: palette.gray[900], borderRadius: 8, padding: 12, borderWidth: 1, borderColor: palette.gray[800] },
  layerKey: { fontSize: 11, fontWeight: '700', color: palette.brand[400], marginBottom: 6, textTransform: 'uppercase' },
  layerVal: { fontSize: 12, color: palette.gray[300], fontFamily: 'monospace', lineHeight: 18 },
  code: { fontSize: 11, color: palette.gray[300], fontFamily: 'monospace', lineHeight: 17 },
});

// ── Profile Editor Modal ───────────────────────────────────────────────────
// Lets an admin fix bad onboarding input. Fields mirror the backend's editable
// projection (CLIENT_PROFILE_FIELDS); the context message sent to GPT is
// recomputed from these on the next plan generation.

type FieldType = 'text' | 'multiline' | 'number' | 'bool' | 'enum' | 'csv' | 'days';
interface FieldSpec { key: string; label: string; type: FieldType; group: string; options?: string[]; hint?: string }

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const PROFILE_FIELDS: FieldSpec[] = [
  // Goal
  { key: 'primaryGoal', label: 'Primary goal', type: 'text', group: 'Goal' },
  { key: 'specificGoal', label: 'Specific goal', type: 'multiline', group: 'Goal' },
  { key: 'timeline', label: 'Timeline', type: 'text', group: 'Goal' },
  { key: 'priorityHierarchy', label: 'Priority hierarchy', type: 'multiline', group: 'Goal' },
  { key: 'successMetrics', label: 'Success metrics', type: 'multiline', group: 'Goal' },
  // Training history
  { key: 'yearsTraining', label: 'Years training', type: 'number', group: 'Training History' },
  { key: 'experienceLevel', label: 'Experience level', type: 'enum', group: 'Training History', options: ['novice', 'beginner', 'intermediate', 'advanced'] },
  { key: 'bestSystems', label: 'Best systems', type: 'csv', group: 'Training History', hint: 'comma-separated' },
  { key: 'failedSystems', label: 'Failed systems', type: 'csv', group: 'Training History', hint: 'comma-separated' },
  { key: 'adaptationSpeed', label: 'Adaptation speed', type: 'text', group: 'Training History' },
  // Strength
  { key: 'squatMax', label: 'Squat 1RM (kg)', type: 'number', group: 'Strength' },
  { key: 'benchMax', label: 'Bench 1RM (kg)', type: 'number', group: 'Strength' },
  { key: 'deadliftMax', label: 'Deadlift 1RM (kg)', type: 'number', group: 'Strength' },
  { key: 'squatERM', label: 'Squat eRM (kg)', type: 'number', group: 'Strength' },
  { key: 'benchERM', label: 'Bench eRM (kg)', type: 'number', group: 'Strength' },
  { key: 'deadliftERM', label: 'Deadlift eRM (kg)', type: 'number', group: 'Strength' },
  { key: 'prTrend', label: 'PR trend', type: 'multiline', group: 'Strength' },
  // Technical
  { key: 'squatWeakPoint', label: 'Squat weak point', type: 'text', group: 'Technical' },
  { key: 'benchWeakPoint', label: 'Bench weak point', type: 'text', group: 'Technical' },
  { key: 'deadliftWeakPoint', label: 'Deadlift weak point', type: 'text', group: 'Technical' },
  { key: 'mobilityLimitations', label: 'Mobility limitations', type: 'csv', group: 'Technical', hint: 'comma-separated' },
  { key: 'preferredSquatStance', label: 'Preferred squat stance', type: 'text', group: 'Technical' },
  // Recovery
  { key: 'avgSleepHours', label: 'Avg sleep hours', type: 'number', group: 'Recovery' },
  { key: 'sleepQuality', label: 'Sleep quality', type: 'text', group: 'Recovery' },
  { key: 'jobStressLevel', label: 'Job stress (1–5)', type: 'number', group: 'Recovery' },
  { key: 'physicalLabor', label: 'Physical labor job', type: 'bool', group: 'Recovery' },
  { key: 'weeklyCardioSessions', label: 'Weekly cardio sessions', type: 'number', group: 'Recovery' },
  { key: 'otherSports', label: 'Other sports', type: 'csv', group: 'Recovery', hint: 'comma-separated' },
  { key: 'otherSportsFrequency', label: 'Other sports frequency', type: 'text', group: 'Recovery' },
  { key: 'injuryHistory', label: 'Injury history', type: 'multiline', group: 'Recovery' },
  { key: 'recoverySpeed', label: 'Recovery speed', type: 'text', group: 'Recovery' },
  // Constraints
  { key: 'trainingDaysPerWeek', label: 'Training days / week', type: 'number', group: 'Constraints' },
  { key: 'trainingDays', label: 'Training days', type: 'days', group: 'Constraints' },
  { key: 'sessionDurationMinutes', label: 'Session duration (min)', type: 'number', group: 'Constraints' },
  { key: 'equipmentAccess', label: 'Equipment access', type: 'multiline', group: 'Constraints' },
  // Exercise response
  { key: 'responseType', label: 'Response type', type: 'multiline', group: 'Exercise Response' },
  { key: 'deadliftRecoveryCost', label: 'Deadlift recovery cost', type: 'text', group: 'Exercise Response' },
  { key: 'painfulExercises', label: 'Painful exercises', type: 'multiline', group: 'Exercise Response' },
  { key: 'preferredExercises', label: 'Preferred exercises', type: 'multiline', group: 'Exercise Response' },
  // Nutrition
  { key: 'currentPhase', label: 'Current phase', type: 'text', group: 'Nutrition' },
  { key: 'dailyProteinTarget', label: 'Daily protein (g)', type: 'number', group: 'Nutrition' },
  { key: 'weightClassTarget', label: 'Weight class target', type: 'text', group: 'Nutrition' },
  { key: 'nutritionTrackingEnabled', label: 'Nutrition tracking enabled', type: 'bool', group: 'Nutrition' },
  // Psychology
  { key: 'prefersStructure', label: 'Prefers structure', type: 'bool', group: 'Psychology' },
  { key: 'missedLiftResponse', label: 'Missed-lift response', type: 'multiline', group: 'Psychology' },
  { key: 'overshootsEffort', label: 'Overshoots effort', type: 'bool', group: 'Psychology' },
  { key: 'motivationConsistency', label: 'Motivation consistency', type: 'multiline', group: 'Psychology' },
  // Tracking
  { key: 'trackingHabits', label: 'Tracking habits', type: 'csv', group: 'Tracking', hint: 'comma-separated' },
  { key: 'historicalWorkoutData', label: 'Historical workout data', type: 'multiline', group: 'Tracking' },
  // Big 3 frequency
  { key: 'squatFrequencyPerWeek', label: 'Squat freq / week', type: 'number', group: 'Big 3 Frequency' },
  { key: 'benchFrequencyPerWeek', label: 'Bench freq / week', type: 'number', group: 'Big 3 Frequency' },
  { key: 'deadliftFrequencyPerWeek', label: 'Deadlift freq / week', type: 'number', group: 'Big 3 Frequency' },
  // Periodization
  { key: 'preferredPeakingStyle', label: 'Preferred peaking style', type: 'text', group: 'Periodization' },
  { key: 'meetExperience', label: 'Meet experience', type: 'number', group: 'Periodization' },
  { key: 'deloadResponse', label: 'Deload response', type: 'multiline', group: 'Periodization' },
  { key: 'taperSensitivity', label: 'Taper sensitivity', type: 'text', group: 'Periodization' },
  // Philosophy
  { key: 'trainingFocus', label: 'Training focus', type: 'enum', group: 'Philosophy', options: ['hypertrophy', 'powerbuilding', 'strength'] },
  { key: 'preferredIntensity', label: 'Preferred intensity (1–5)', type: 'number', group: 'Philosophy' },
];

function profileToForm(profile: Record<string, any> | null): Record<string, any> {
  const form: Record<string, any> = {};
  for (const f of PROFILE_FIELDS) {
    const raw = profile?.[f.key];
    if (f.type === 'bool') form[f.key] = raw === true || raw === 1 || raw === '1';
    else if (f.type === 'csv' || f.type === 'days') form[f.key] = Array.isArray(raw) ? raw : [];
    else form[f.key] = raw == null ? '' : String(raw);
  }
  return form;
}

function formToPayload(form: Record<string, any>): Record<string, any> {
  const payload: Record<string, any> = {};
  for (const f of PROFILE_FIELDS) {
    const v = form[f.key];
    if (f.type === 'bool') {
      payload[f.key] = !!v;
    } else if (f.type === 'number') {
      if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        if (!Number.isNaN(n)) payload[f.key] = n;
      }
    } else if (f.type === 'csv' || f.type === 'days') {
      if (Array.isArray(v) && v.length) payload[f.key] = v;
    } else {
      if (typeof v === 'string' && v.trim() !== '') payload[f.key] = v;
    }
  }
  return payload;
}

function ProfileEditModal({
  visible, onClose, userId, onSaved,
}: { visible: boolean; onClose: () => void; userId: string; onSaved: () => void }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    adminAiService.getProfile(userId)
      .then((p) => { setHasProfile(p != null); setForm(profileToForm(p)); })
      .catch(() => Alert.alert('Error', 'Could not load profile'))
      .finally(() => setLoading(false));
  }, [visible, userId]);

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleArrayValue = (key: string, value: string) =>
    setForm((prev) => {
      const arr: string[] = Array.isArray(prev[key]) ? prev[key] : [];
      return { ...prev, [key]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
    });

  const save = async () => {
    setSaving(true);
    try {
      await adminAiService.saveProfile(userId, formToPayload(form));
      Alert.alert('Saved', 'Profile updated. The next plan will use the new context.');
      onSaved();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? e?.message ?? 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  // Group fields for rendering, preserving declaration order.
  const groups: { name: string; fields: FieldSpec[] }[] = [];
  for (const f of PROFILE_FIELDS) {
    let g = groups.find((x) => x.name === f.group);
    if (!g) { g = { name: f.group, fields: [] }; groups.push(g); }
    g.fields.push(f);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
        <View style={edit.header}>
          <TouchableOpacity onPress={onClose}><Text style={edit.close}>✕</Text></TouchableOpacity>
          <Text style={edit.title}>Edit AI Profile</Text>
          <TouchableOpacity onPress={save} disabled={saving || loading}>
            {saving
              ? <ActivityIndicator size="small" color={palette.brand[400]} />
              : <Text style={[edit.save, (loading) && { opacity: 0.4 }]}>Save</Text>}
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator color={palette.brand[400]} style={{ marginTop: 40 }} />
        ) : (
          <KeyboardAwareScreen contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
            {!hasProfile && (
              <Text style={edit.notice}>No AI profile exists yet — saving will create one.</Text>
            )}
            {groups.map((g) => (
              <View key={g.name} style={edit.group}>
                <Text style={edit.groupTitle}>{g.name}</Text>
                {g.fields.map((f) => (
                  <View key={f.key} style={edit.field}>
                    <View style={edit.fieldLabelRow}>
                      <Text style={edit.fieldLabel}>{f.label}</Text>
                      {f.hint && <Text style={edit.fieldHint}>{f.hint}</Text>}
                    </View>
                    {f.type === 'bool' && (
                      <Switch
                        value={!!form[f.key]}
                        onValueChange={(v) => set(f.key, v)}
                        trackColor={{ false: palette.gray[700], true: palette.brand[600] }}
                        thumbColor="#fff"
                      />
                    )}
                    {f.type === 'enum' && (
                      <View style={edit.chipRow}>
                        {f.options!.map((opt) => {
                          const active = form[f.key] === opt;
                          return (
                            <TouchableOpacity
                              key={opt}
                              style={[edit.chip, active && edit.chipActive]}
                              onPress={() => set(f.key, active ? '' : opt)}
                            >
                              <Text style={[edit.chipText, active && edit.chipTextActive]}>{opt}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                    {f.type === 'days' && (
                      <View style={edit.chipRow}>
                        {WEEKDAYS.map((d) => {
                          const active = Array.isArray(form[f.key]) && form[f.key].includes(d);
                          return (
                            <TouchableOpacity
                              key={d}
                              style={[edit.chip, active && edit.chipActive]}
                              onPress={() => toggleArrayValue(f.key, d)}
                            >
                              <Text style={[edit.chipText, active && edit.chipTextActive]}>{d.slice(0, 3)}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                    {(f.type === 'text' || f.type === 'multiline' || f.type === 'number' || f.type === 'csv') && (
                      <TextInput
                        style={[edit.input, f.type === 'multiline' && edit.inputMultiline]}
                        value={f.type === 'csv' ? (Array.isArray(form[f.key]) ? form[f.key].join(', ') : '') : form[f.key]}
                        onChangeText={(txt) =>
                          f.type === 'csv'
                            ? set(f.key, txt.split(',').map((s) => s.trim()).filter(Boolean))
                            : set(f.key, txt)
                        }
                        multiline={f.type === 'multiline'}
                        keyboardType={f.type === 'number' ? 'decimal-pad' : 'default'}
                        placeholder={f.type === 'number' ? '—' : ''}
                        placeholderTextColor={palette.gray[600]}
                      />
                    )}
                  </View>
                ))}
              </View>
            ))}
          </KeyboardAwareScreen>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const edit = StyleSheet.create({
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: palette.gray[800] },
  title:   { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  close:   { fontSize: 22, color: palette.gray[400] },
  save:    { fontSize: 15, fontWeight: '700', color: palette.brand[400] },
  notice:  { fontSize: 12, color: palette.warning[400], marginBottom: 14, lineHeight: 17 },
  group:      { marginBottom: 18 },
  groupTitle: { fontSize: 11, fontWeight: '700', color: palette.brand[400], textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  field:         { marginBottom: 12 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  fieldLabel:    { fontSize: 12, fontWeight: '600', color: palette.gray[300] },
  fieldHint:     { fontSize: 10, color: palette.gray[600], fontStyle: 'italic' },
  input: {
    backgroundColor: palette.gray[900], borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9,
    color: theme.colors.text, fontSize: 14, borderWidth: 1, borderColor: palette.gray[700],
  },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: palette.gray[700], backgroundColor: palette.gray[900] },
  chipActive:  { borderColor: palette.brand[500], backgroundColor: palette.brand[600] + '33' },
  chipText:    { fontSize: 12, color: palette.gray[400] },
  chipTextActive: { color: palette.brand[300], fontWeight: '700' },
});

// ── Main Screen ───────────────────────────────────────────────────────────

export const AdminAILabScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const { userId: initialUserId, userName: initialUserName } = route.params ?? {};

  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserEntry | null>(null);
  const [state, setState] = useState<AdminUserState | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [debugVisible, setDebugVisible] = useState(false);
  const [profileEditVisible, setProfileEditVisible] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [showUserPicker, setShowUserPicker] = useState(false);

  // Local phase/slot editing state
  const [editPhase, setEditPhase] = useState<string>('accumulation');
  const [editWeek, setEditWeek] = useState('1');
  const [editSlotOffset, setEditSlotOffset] = useState('0');
  const [editFatigue, setEditFatigue] = useState<FatigueLevel | null>(null);
  const [editErmSqERM, setEditErmSqERM] = useState('');
  const [editErmBnERM, setEditErmBnERM] = useState('');
  const [editErmDlERM, setEditErmDlERM] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      const list = await adminAiService.getUsers();
      setUsers(list);
    } catch {
      Alert.alert('Error', 'Could not load users');
    }
  }, []);

  const loadState = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const s = await adminAiService.getState(uid);
      setState(s);
      setEditPhase(s.phase ?? 'accumulation');
      setEditWeek(String(s.weekInPhase));
      setEditSlotOffset(String(s.testCycleSlotOffset ?? 0));
      setEditFatigue(s.fatigueOverride as FatigueLevel | null);
      setEditErmSqERM('');
      setEditErmBnERM('');
      setEditErmDlERM('');
    } catch {
      Alert.alert('Error', 'Could not load user state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (initialUserId) {
      setSelectedUser({ id: initialUserId, email: '', name: initialUserName ?? initialUserId, role: '', hasAIProfile: true, totalSessions: 0 });
      loadState(initialUserId);
    }
  }, [initialUserId, initialUserName, loadState]);

  const run = async (key: string, fn: () => Promise<void>, successMsg?: string) => {
    setBusy(key);
    try {
      await fn();
      if (successMsg) Alert.alert('Done', successMsg);
      if (selectedUser) await loadState(selectedUser.id);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? e.message ?? 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const selectUser = (u: AdminUserEntry) => {
    setSelectedUser(u);
    setShowUserPicker(false);
    setUserSearch('');
    loadState(u.id);
  };

  const uid = selectedUser?.id ?? '';
  // Slots are Monday-anchored on the backend (WEEK_DAY_ORDER), so sort the same way
  // here — the raw trainingDays array is in onboarding-entry order and would mislabel
  // which weekday each slot maps to.
  const sortedDays = state?.trainingDays
    ? [...state.trainingDays].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b))
    : [];
  const cycleN = sortedDays.length || 4;
  // cycleSlot from getState already includes the saved offset; back it out to find
  // the natural (offset-0) calendar slot so the override chips preview correctly.
  const naturalSlot = state
    ? ((state.cycleSlot - (state.testCycleSlotOffset ?? 0)) % cycleN + cycleN) % cycleN
    : 0;
  const slotLabels = sortedDays.length
    ? sortedDays.map((d, i) => `${i}: ${d.slice(0, 3)}`)
    : ['0: Day 1', '1: Day 2', '2: Day 3', '3: Day 4'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backBtn} />
        <Text style={styles.title}>AI Lab</Text>
        {selectedUser && (
          <TouchableOpacity onPress={() => loadState(selectedUser.id)} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>↻</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* User picker */}
      <TouchableOpacity style={styles.userPicker} onPress={() => setShowUserPicker(true)}>
        <Text style={styles.userPickerLabel}>
          {selectedUser ? `${selectedUser.name} (${selectedUser.email})` : 'Select a user...'}
        </Text>
        <Text style={styles.userPickerChevron}>▾</Text>
      </TouchableOpacity>

      {/* User search modal */}
      <Modal visible={showUserPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowUserPicker(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'bottom']}>
          <View style={picker.header}>
            <Text style={picker.title}>Select User</Text>
            <TouchableOpacity onPress={() => setShowUserPicker(false)}><Text style={picker.close}>✕</Text></TouchableOpacity>
          </View>
          <View style={{ padding: 12 }}>
            <TextInput
              style={picker.search}
              placeholder="Search by name or email..."
              placeholderTextColor={palette.gray[500]}
              value={userSearch}
              onChangeText={setUserSearch}
              autoFocus
            />
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}>
            {filteredUsers.map((u) => (
              <TouchableOpacity key={u.id} style={picker.item} onPress={() => selectUser(u)}>
                <View style={{ flex: 1 }}>
                  <Text style={picker.name}>{u.name}</Text>
                  <Text style={picker.email}>{u.email} · {u.role} · {u.totalSessions} sessions</Text>
                </View>
                {!u.hasAIProfile && <Text style={picker.noProfile}>no AI profile</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {!selectedUser ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Select a user to begin testing</Text></View>
      ) : loading ? (
        <ActivityIndicator color={palette.brand[400]} style={{ marginTop: 60 }} />
      ) : !state ? (
        <View style={styles.empty}><Text style={styles.emptyText}>No AI profile found for this user</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* ── Current State ──────────────────────────────────────────── */}
          <Section title="Current State">
            <View style={styles.statGrid}>
              <View style={styles.statCell}>
                <Text style={[styles.statBig, { color: PHASE_COLORS[state.phase ?? ''] ?? palette.brand[400] }]}>
                  {(state.phase ?? 'none').toUpperCase()}
                </Text>
                <Text style={styles.statSub}>Phase</Text>
                <PhaseBar week={state.weekInPhase} total={state.totalWeeks} phase={state.phase ?? 'accumulation'} />
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statBig}>{state.cycleSlot + 1}<Text style={styles.statOf}>/{cycleN}</Text></Text>
                <Text style={styles.statSub}>Cycle Slot</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={[styles.statBig, { color: FATIGUE_COLORS[state.fatigueReal] ?? palette.gray[400] }]}>
                  {state.fatigueReal.toUpperCase()}
                </Text>
                <Text style={styles.statSub}>Real Fatigue</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statBig}>{state.totalSessions}</Text>
                <Text style={styles.statSub}>Sessions</Text>
              </View>
            </View>
            <Row label="Plan rate limit" value={`${state.planRateLimitCount}/${state.planRateLimitMax} today`}
              accent={state.planRateLimitCount >= state.planRateLimitMax ? palette.error[400] : undefined} />
            <Row label="Plan generated" value={state.planGeneratedAt ? new Date(state.planGeneratedAt).toLocaleTimeString() : '—'} />
            {state.trainingDays && (
              <Row label="Training days" value={state.trainingDays.map((d) => d.slice(0, 3)).join(', ')} />
            )}
            {(state.squatFreq || state.benchFreq || state.deadliftFreq) && (
              <Row
                label="Big 3 freq"
                value={[
                  state.squatFreq && `Sq ${state.squatFreq}x`,
                  state.benchFreq && `Bn ${state.benchFreq}x`,
                  state.deadliftFreq && `Dl ${state.deadliftFreq}x`,
                ].filter(Boolean).join('  ')}
              />
            )}
            <Row label="Memory (hot)" value={`${state.memoryLength} chars`} />
            <Row label="Memory (archive)" value={`${state.memoryArchiveLength} chars`} />
            <Row label="Active notes" value={String(state.activeNotesCount)} />
            <Row label="Exercise intel" value={`${state.exerciseIntelCount} exercises`} />
            {state.fatigueEvidence.length > 0 && (
              <View style={styles.evidenceBox}>
                {state.fatigueEvidence.map((e, i) => (
                  <Text key={i} style={styles.evidenceItem}>• {e}</Text>
                ))}
              </View>
            )}
          </Section>

          {/* ── Phase Control ──────────────────────────────────────────── */}
          <Section title="Phase Control">
            <Text style={styles.fieldLabel}>Phase</Text>
            <ChipRow options={PHASES as any} selected={editPhase} onSelect={setEditPhase} colorMap={PHASE_COLORS} />
            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Week into phase</Text>
            <View style={styles.weekRow}>
              {[1, 2, 3, 4, 5, 6].map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[styles.weekChip, editWeek === String(w) && styles.weekChipActive]}
                  onPress={() => setEditWeek(String(w))}
                >
                  <Text style={[styles.weekChipText, editWeek === String(w) && styles.weekChipTextActive]}>{w}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Btn
              label={`Set ${editPhase} · Wk ${editWeek}`}
              loading={busy === 'phase'}
              onPress={() => run('phase', () => adminAiService.setPhase(uid, editPhase, Number(editWeek)), 'Phase updated')}
            />
          </Section>

          {/* ── Cycle Slot ────────────────────────────────────────────── */}
          <Section title="Cycle Slot Override">
            <Text style={styles.fieldLabel}>
              Effective slot: {state.cycleSlot + 1}/{cycleN}
              {sortedDays[state.cycleSlot] ? ` (${sortedDays[state.cycleSlot].slice(0, 3)})` : ''}
              {(state.testCycleSlotOffset ?? 0) !== 0 ? ` · offset +${state.testCycleSlotOffset}` : ''}
            </Text>
            <Text style={styles.fieldHint}>
              Shifts the next workout forward by N slots from the natural calendar day
              {sortedDays[naturalSlot] ? ` (${sortedDays[naturalSlot].slice(0, 3)})` : ''}. Offset 0 = no change.
            </Text>
            {sortedDays.length > 0 && (
              <Text style={styles.fieldHint}>
                {sortedDays.map((_, i) => {
                  const slot = (naturalSlot + i) % cycleN;
                  return `+${i} → ${sortedDays[slot].slice(0, 3)}`;
                }).join('  ·  ')}
              </Text>
            )}
            <View style={styles.weekRow}>
              {Array.from({ length: cycleN }, (_, i) => i).map((i) => {
                const slot = (naturalSlot + i) % cycleN;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.weekChip, editSlotOffset === String(i) && styles.weekChipActive]}
                    onPress={() => setEditSlotOffset(String(i))}
                  >
                    <Text style={[styles.weekChipText, editSlotOffset === String(i) && styles.weekChipTextActive]}>
                      {`+${i} ${sortedDays[slot]?.slice(0, 3) ?? ''}`.trim()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Btn
              label={
                sortedDays[(naturalSlot + Number(editSlotOffset)) % cycleN]
                  ? `Set → ${sortedDays[(naturalSlot + Number(editSlotOffset)) % cycleN].slice(0, 3)} (offset ${editSlotOffset})`
                  : `Set offset → ${editSlotOffset}`
              }
              loading={busy === 'slot'}
              onPress={() => run('slot', () => adminAiService.setCycleSlot(uid, Number(editSlotOffset)), 'Slot offset updated')}
            />
          </Section>

          {/* ── Fatigue Override ─────────────────────────────────────── */}
          <Section title="Fatigue Override">
            <Text style={styles.fieldHint}>
              Overrides real computation so you can test how GPT responds to each fatigue level.
              {state.fatigueOverride ? `\nCurrently forced: ${state.fatigueOverride.toUpperCase()}` : '\nCurrently: using real data'}
            </Text>
            <ChipRow
              options={FATIGUE_LEVELS}
              selected={editFatigue}
              onSelect={setEditFatigue}
              colorMap={FATIGUE_COLORS}
            />
            <View style={styles.btnRow}>
              <Btn
                label={`Force ${editFatigue ?? 'none'}`}
                loading={busy === 'fatigue'}
                onPress={() => run('fatigue', () => adminAiService.setFatigue(uid, editFatigue), `Fatigue forced to ${editFatigue ?? 'none'}`)}
              />
              <Btn
                label="Clear override"
                outline
                color={palette.gray[400]}
                loading={busy === 'fatigue-clear'}
                onPress={() => run('fatigue-clear', () => adminAiService.setFatigue(uid, null), 'Fatigue override cleared')}
              />
            </View>
          </Section>

          {/* ── Rate Limits & Plan Gen ────────────────────────────────── */}
          <Section title="Rate Limits & Plan Generation">
            <Row
              label="Plan generations today"
              value={`${state.planRateLimitCount}/${state.planRateLimitMax}`}
              accent={state.planRateLimitCount >= state.planRateLimitMax ? palette.error[400] : palette.success[400]}
            />
            <View style={styles.btnRow}>
              <Btn
                label="Reset rate limits"
                outline
                color={palette.warning[400]}
                loading={busy === 'ratelimit'}
                onPress={() => run('ratelimit', () => adminAiService.resetRateLimit(uid), 'Rate limits reset')}
              />
              <Btn
                label="Force generate plan"
                color={palette.brand[600]}
                loading={busy === 'generate'}
                onPress={() =>
                  Alert.alert(
                    'Force Generate Plan',
                    'This calls GPT and costs tokens. Continue?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Generate',
                        onPress: () =>
                          run('generate', async () => {
                            const plan = await adminAiService.forceGeneratePlan(uid);
                            Alert.alert('Plan Generated', plan.slice(0, 300) + (plan.length > 300 ? '…' : ''));
                          }),
                      },
                    ],
                  )
                }
              />
            </View>
          </Section>

          {/* ── eRM Override ─────────────────────────────────────────── */}
          <Section title="eRM / 1RM Override">
            <Text style={styles.fieldHint}>Leave blank to skip. Affects load selection in next plan.</Text>
            <View style={styles.ermGrid}>
              {[
                { label: 'Squat eRM', val: editErmSqERM, set: setEditErmSqERM },
                { label: 'Bench eRM', val: editErmBnERM, set: setEditErmBnERM },
                { label: 'Deadlift eRM', val: editErmDlERM, set: setEditErmDlERM },
              ].map(({ label, val, set }) => (
                <View key={label} style={styles.ermField}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    value={val}
                    onChangeText={set}
                    keyboardType="decimal-pad"
                    placeholder="kg"
                    placeholderTextColor={palette.gray[600]}
                  />
                </View>
              ))}
            </View>
            <Btn
              label="Apply eRM values"
              loading={busy === 'erm'}
              onPress={() =>
                run('erm', () =>
                  adminAiService.setErm(uid, {
                    squatERM: editErmSqERM ? Number(editErmSqERM) : undefined,
                    benchERM: editErmBnERM ? Number(editErmBnERM) : undefined,
                    deadliftERM: editErmDlERM ? Number(editErmDlERM) : undefined,
                  }), 'eRM values updated',
                )
              }
            />
          </Section>

          {/* ── Memory Tools ─────────────────────────────────────────── */}
          <Section title="Memory Tools">
            <Row label="Hot memory" value={`${state.memoryLength} chars`} />
            <Row label="Archive" value={`${state.memoryArchiveLength} chars`} />
            <Row label="Active notes" value={String(state.activeNotesCount)} />
            <Row label="Exercise intel records" value={String(state.exerciseIntelCount)} />
            <View style={styles.btnRow}>
              <Btn
                label="Clear hot memory"
                outline
                color={palette.warning[400]}
                loading={busy === 'mem-hot'}
                onPress={() =>
                  Alert.alert('Clear hot memory?', 'GPT will lose recent session observations. Archive kept.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: () => run('mem-hot', () => adminAiService.clearMemory(uid, false, false)) },
                  ])
                }
              />
              <Btn
                label="Clear notes"
                outline
                color={palette.warning[400]}
                loading={busy === 'mem-notes'}
                onPress={() =>
                  Alert.alert('Deactivate all notes?', 'All PLATEAU, INJURY, BREAKTHROUGH etc notes will be deactivated.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: () => run('mem-notes', () => adminAiService.clearMemory(uid, true, false)) },
                  ])
                }
              />
            </View>
            <Btn
              label="Clear exercise intelligence"
              outline
              color={palette.error[400]}
              loading={busy === 'mem-ex'}
              onPress={() =>
                Alert.alert('Clear exercise intel?', 'Deletes all per-exercise progression data and plateau tracking for this user.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: () => run('mem-ex', () => adminAiService.clearMemory(uid, false, true)) },
                ])
              }
            />
          </Section>

          {/* ── Session Data ─────────────────────────────────────────── */}
          <Section title="Session Data">
            <Btn
              label="Clear all sessions"
              outline
              color={palette.error[400]}
              loading={busy === 'sessions'}
              onPress={() =>
                Alert.alert(
                  'Clear all sessions?',
                  'Deletes every completed and in-progress workout session, set logs, and resets the AI plan for this user. This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () =>
                        run('sessions', () => adminAiService.clearSessions(uid).then(() => {}), 'Sessions cleared'),
                    },
                  ],
                )
              }
            />
            <Btn
              label="Reset profile to beginning"
              outline
              color={palette.error[500]}
              loading={busy === 'reset-profile'}
              onPress={() =>
                Alert.alert(
                  'Reset profile to beginning?',
                  'Wipes all sessions, set logs, AI memory, notes, exercise intelligence, and the AI coach profile. Token usage is preserved. The user will need to redo onboarding. This cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: () =>
                        run('reset-profile', () => adminAiService.resetProfile(uid).then(() => {}), 'Profile reset'),
                    },
                  ],
                )
              }
            />
          </Section>

          {/* ── Athlete Profile ──────────────────────────────────────── */}
          <Section title="Athlete Profile">
            <Text style={styles.fieldHint}>
              View and fix the onboarding answers this user entered. These feed the context message GPT receives —
              correcting bad input here updates the next plan.
            </Text>
            <Btn label="Edit AI Profile" onPress={() => setProfileEditVisible(true)} />
          </Section>

          {/* ── Debug Prompt ─────────────────────────────────────────── */}
          <Section title="Debug Prompt">
            <Text style={styles.fieldHint}>
              View the exact system prompt and all context layers that will be sent to GPT for the next plan generation.
            </Text>
            <Btn label="Open Debug Prompt" onPress={() => setDebugVisible(true)} />
          </Section>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {selectedUser && (
        <DebugModal
          visible={debugVisible}
          onClose={() => setDebugVisible(false)}
          userId={selectedUser.id}
        />
      )}

      {selectedUser && (
        <ProfileEditModal
          visible={profileEditVisible}
          onClose={() => setProfileEditVisible(false)}
          userId={selectedUser.id}
          onSaved={() => loadState(selectedUser.id)}
        />
      )}
    </SafeAreaView>
  );
};

// ── Picker styles ──────────────────────────────────────────────────────────

const picker = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: palette.gray[800] },
  title:  { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  close:  { fontSize: 22, color: palette.gray[400] },
  search: {
    backgroundColor: palette.gray[900], borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    color: theme.colors.text, fontSize: 14, borderWidth: 1, borderColor: palette.gray[700],
  },
  item:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.gray[800] },
  name:       { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  email:      { fontSize: 12, color: palette.gray[500], marginTop: 2 },
  noProfile:  { fontSize: 10, color: palette.error[400], backgroundColor: palette.error[900] + '44', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
});

// ── Main styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: theme.colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:     { padding: 4, marginRight: 10 },
  backArrow:   { fontSize: 22, color: theme.colors.text },
  title:       { flex: 1, fontSize: 20, fontWeight: '700', color: theme.colors.text },
  refreshBtn:  { padding: 4 },
  refreshText: { fontSize: 22, color: palette.brand[400] },

  userPicker:       { marginHorizontal: 16, marginBottom: 10, backgroundColor: palette.gray[900], borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: palette.gray[700], flexDirection: 'row', alignItems: 'center' },
  userPickerLabel:  { flex: 1, fontSize: 14, color: theme.colors.text },
  userPickerChevron:{ fontSize: 14, color: palette.gray[500] },

  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: palette.gray[500], fontSize: 15 },

  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  section:      { backgroundColor: palette.gray[900], borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: palette.gray[800] },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: palette.brand[400], textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  statCell: { flex: 1, minWidth: '45%', backgroundColor: palette.gray[800], borderRadius: 8, padding: 10 },
  statBig:  { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  statOf:   { fontSize: 13, fontWeight: '400', color: palette.gray[500] },
  statSub:  { fontSize: 10, color: palette.gray[500], marginTop: 2 },

  row:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: palette.gray[800] },
  rowLabel:  { fontSize: 13, color: palette.gray[400] },
  rowValue:  { fontSize: 13, fontWeight: '600', color: theme.colors.text },

  evidenceBox:  { marginTop: 8, backgroundColor: palette.gray[800], borderRadius: 8, padding: 10 },
  evidenceItem: { fontSize: 11, color: palette.gray[400], marginBottom: 3 },

  fieldLabel: { fontSize: 11, fontWeight: '600', color: palette.gray[400], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fieldHint:  { fontSize: 12, color: palette.gray[500], marginBottom: 10, lineHeight: 17 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: palette.gray[700], backgroundColor: palette.gray[800] },
  chipText:{ fontSize: 12, color: palette.gray[400] },

  weekRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  weekChip:      { width: 44, height: 34, borderRadius: 8, borderWidth: 1, borderColor: palette.gray[700], backgroundColor: palette.gray[800], alignItems: 'center', justifyContent: 'center' },
  weekChipActive:{ borderColor: palette.brand[500], backgroundColor: palette.brand[600] + '33' },
  weekChipText:  { fontSize: 12, color: palette.gray[400] },
  weekChipTextActive: { color: palette.brand[300], fontWeight: '700' },

  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  btn:    { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 42 },
  btnSmall: { paddingVertical: 7, minHeight: 34 },
  btnText:  { fontSize: 13, fontWeight: '700', color: '#fff' },

  ermGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  ermField: { width: '47%' },
  input: {
    backgroundColor: palette.gray[800], borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9,
    color: theme.colors.text, fontSize: 14, borderWidth: 1, borderColor: palette.gray[700],
  },
});
