import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Copy, UserPlus, Barbell } from 'phosphor-react-native';
import { Card, Button, KeyboardAwareScreen } from '../../components/ui';
import { usersService } from '../../services/users.service';
import { aiCoachService } from '../../services/ai-coach.service';
import { theme, palette, alpha } from '../../theme';
import { apiErrorMessage } from '../../utils/apiError';

/**
 * A coach creating an account for an athlete, filling in what they already know.
 *
 * This is the entry point to the whole coach-review flow: the account it creates is the
 * only thing that sets `coachId`, and an athlete without one keeps the self-serve app.
 *
 * The profile fields are optional and deliberately few — the ones the session engine
 * actually needs to price a first workout. Everything else the athlete fills in later
 * through their own AI Coach settings, which is the same editor this writes to.
 */

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const LEVELS = ['novice', 'beginner', 'intermediate', 'advanced'] as const;

export const AddClientScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [squat, setSquat] = useState('');
  const [bench, setBench] = useState('');
  const [deadlift, setDeadlift] = useState('');
  const [level, setLevel] = useState<typeof LEVELS[number] | null>(null);
  const [days, setDays] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ name: string; email: string; tempPassword?: string } | null>(null);

  const toggleDay = (d: string) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const num = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const submit = async () => {
    if (!email.trim() || !name.trim()) {
      Alert.alert(t('addClient.missingTitle'), t('addClient.missingBody'));
      return;
    }
    setBusy(true);
    try {
      const client = await usersService.createClient({ email: email.trim(), name: name.trim() });

      // Seed the profile only with what was actually filled in. A blank field must
      // reach the engine as "unknown", never as a zero it would price a bar off.
      const seed: Record<string, unknown> = {};
      if (num(squat)) seed.squatMax = num(squat);
      if (num(bench)) seed.benchMax = num(bench);
      if (num(deadlift)) seed.deadliftMax = num(deadlift);
      if (level) seed.experienceLevel = level;
      if (days.length) seed.trainingDays = days;

      if (Object.keys(seed).length) {
        // A failed profile seed must not read as a failed signup — the account exists
        // and the coach can fill this in from the athlete's screen instead.
        await aiCoachService.coachSaveAthleteProfile(client.id, seed as never).catch(() => {
          Alert.alert(t('addClient.profileFailedTitle'), t('addClient.profileFailedBody'));
        });
      }

      setCreated({ name: client.name, email: client.email, tempPassword: client.temporaryPassword });
    } catch (err) {
      Alert.alert(t('common.error'), apiErrorMessage(err, t('addClient.createFailed')));
    } finally {
      setBusy(false);
    }
  };

  // Success state. The temporary password is shown HERE and nowhere else, ever — it is
  // stored only as a hash, so a coach who leaves this screen without passing it on has
  // to have the athlete reset instead.
  if (created) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">{t('addClient.doneTitle')}</Text>
          <Text style={styles.subtitle}>{t('addClient.doneSubtitle', { name: created.name })}</Text>
        </View>
        <View style={styles.scroll}>
          <Card style={styles.cardSpacing}>
            <Text style={styles.fieldLabel}>{t('addClient.email')}</Text>
            <Text style={styles.credential}>{created.email}</Text>

            {created.tempPassword ? (
              <>
                <Text style={[styles.fieldLabel, { marginTop: theme.spacing.lg }]}>
                  {t('addClient.tempPassword')}
                </Text>
                <Text style={styles.credential}>{created.tempPassword}</Text>
                <Text style={styles.warnText}>{t('addClient.tempPasswordWarning')}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.shareBtn}
                  onPress={() => Share.share({
                    message: t('addClient.shareMessage', {
                      name: created.name, email: created.email, password: created.tempPassword,
                    }),
                  })}
                >
                  <Copy size={15} weight="bold" color={palette.brand[400]} />
                  <Text style={styles.shareBtnText}>{t('addClient.share')}</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </Card>

          <Card style={styles.cardSpacing}>
            <View style={styles.nextRow}>
              <Barbell size={16} weight="fill" color={palette.brand[400]} />
              <Text style={styles.nextText}>{t('addClient.whatHappensNext')}</Text>
            </View>
          </Card>

          <Button label={t('common.done')} onPress={() => navigation.goBack()} isFullWidth />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">{t('addClient.title')}</Text>
        <Text style={styles.subtitle}>{t('addClient.subtitle')}</Text>
      </View>

      <KeyboardAwareScreen contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card style={styles.cardSpacing}>
          <Text style={styles.fieldLabel}>{t('addClient.name')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('addClient.namePlaceholder')}
            placeholderTextColor={palette.gray[600]}
            accessibilityLabel={t('addClient.name')}
          />
          <Text style={[styles.fieldLabel, { marginTop: theme.spacing.lg }]}>{t('addClient.email')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="athlete@example.com"
            placeholderTextColor={palette.gray[600]}
            accessibilityLabel={t('addClient.email')}
          />
          <Text style={styles.hint}>{t('addClient.passwordHint')}</Text>
        </Card>

        <Card style={styles.cardSpacing}>
          <Text style={styles.cardLabel}>{t('addClient.whatYouKnow')}</Text>
          <Text style={styles.hint}>{t('addClient.whatYouKnowHint')}</Text>

          <Text style={[styles.fieldLabel, { marginTop: theme.spacing.lg }]}>{t('addClient.maxes')}</Text>
          <View style={styles.maxRow}>
            {([['S', squat, setSquat], ['B', bench, setBench], ['D', deadlift, setDeadlift]] as const).map(
              ([label, val, set]) => (
                <View key={label} style={styles.maxCell}>
                  <Text style={styles.maxLabel}>{label}</Text>
                  <TextInput
                    style={styles.maxInput}
                    value={val}
                    onChangeText={set}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={palette.gray[600]}
                    accessibilityLabel={`${t('addClient.maxes')} ${label}`}
                  />
                </View>
              ),
            )}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: theme.spacing.lg }]}>{t('addClient.level')}</Text>
          <View style={styles.chipWrap}>
            {LEVELS.map((l) => (
              <TouchableOpacity
                key={l}
                accessibilityRole="button"
                accessibilityState={{ selected: level === l }}
                style={[styles.chip, level === l && styles.chipActive]}
                onPress={() => setLevel(level === l ? null : l)}
              >
                <Text style={[styles.chipText, level === l && styles.chipTextActive]}>
                  {t(`addClient.levels.${l}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: theme.spacing.lg }]}>{t('addClient.trainingDays')}</Text>
          <View style={styles.chipWrap}>
            {DAYS.map((d) => (
              <TouchableOpacity
                key={d}
                accessibilityRole="button"
                accessibilityState={{ selected: days.includes(d) }}
                style={[styles.chip, days.includes(d) && styles.chipActive]}
                onPress={() => toggleDay(d)}
              >
                <Text style={[styles.chipText, days.includes(d) && styles.chipTextActive]}>
                  {t(`addClient.days.${d}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Button
          label={t('addClient.create')}
          onPress={submit}
          isLoading={busy}
          isFullWidth
          leftIcon={<UserPlus size={17} weight="bold" color={palette.white} />}
        />
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.lg },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 19 },
  scroll: { paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing['4xl'] },
  cardSpacing: { marginBottom: theme.spacing.lg },
  cardLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  fieldLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase',
    color: theme.colors.textTertiary, marginBottom: 6,
  },
  input: {
    fontSize: 16, color: theme.colors.text, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  hint: { fontSize: 12, color: theme.colors.textTertiary, marginTop: theme.spacing.sm, lineHeight: 18 },

  maxRow: { flexDirection: 'row', gap: theme.spacing.lg },
  maxCell: { flex: 1 },
  maxLabel: { fontSize: 11, fontWeight: '700', color: palette.brand[400], marginBottom: 2 },
  maxInput: {
    fontSize: 18, fontWeight: '600', color: theme.colors.text, paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.cardElevated,
    borderWidth: 1, borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: alpha(palette.brand[500], 0.15), borderColor: alpha(palette.brand[500], 0.45),
  },
  chipText: { fontSize: 12, color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.text, fontWeight: '600' },

  credential: { fontSize: 17, fontWeight: '700', color: theme.colors.text, letterSpacing: 0.5 },
  warnText: { fontSize: 12, color: palette.warning[400], marginTop: theme.spacing.sm, lineHeight: 18 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: theme.spacing.lg, paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: alpha(palette.brand[500], 0.4),
  },
  shareBtnText: { fontSize: 13, fontWeight: '600', color: palette.brand[400] },
  nextRow: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' },
  nextText: { flex: 1, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 19 },
});
