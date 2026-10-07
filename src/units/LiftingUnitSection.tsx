import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme, palette } from '../theme';
import { useAuthStore } from '../stores/auth.store';
import { usersService } from '../services/users.service';
import { LiftingUnit } from './weight';
import { useLiftingUnit } from './useLiftingUnit';

const OPTIONS: { unit: LiftingUnit; label: string }[] = [
  { unit: 'kg', label: 'kg' },
  { unit: 'lb', label: 'lb' },
];

/**
 * Profile → "Bar weights in kg / lb". Changes only what the app shows and how it reads
 * what the athlete types; every stored load stays in kg, so switching back and forth
 * never moves a number on the server.
 */
export const LiftingUnitSection: React.FC = () => {
  const { t } = useTranslation();
  const unit = useLiftingUnit();
  const setUser = useAuthStore((s) => s.setUser);
  const [saving, setSaving] = useState(false);

  const choose = async (next: LiftingUnit) => {
    if (next === unit || saving) return;
    setSaving(true);
    try {
      await setUser(await usersService.updateProfile({ liftingUnit: next }));
    } catch {
      Alert.alert(t('common.error', { defaultValue: 'Error' }), t('liftingUnit.saveFailed', { defaultValue: 'Could not change the unit. Try again.' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t('liftingUnit.title', { defaultValue: 'BAR WEIGHTS' })}</Text>
      <Text style={styles.sub}>
        {t('liftingUnit.sub', { defaultValue: 'The unit you load the bar in. Your history converts with it.' })}
      </Text>
      <View style={styles.row}>
        {OPTIONS.map((o) => {
          const active = o.unit === unit;
          return (
            <TouchableOpacity
              key={o.unit}
              style={[styles.btn, active && styles.btnActive]}
              onPress={() => choose(o.unit)}
              disabled={saving}
              accessibilityRole="radio"
              accessibilityState={{ checked: active, disabled: saving }}
              accessibilityLabel={o.unit === 'lb'
                ? t('units.pounds', { defaultValue: 'pounds' })
                : t('units.kilograms', { defaultValue: 'kilograms' })}
            >
              <Text style={[styles.btnText, active && styles.btnTextActive]}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: { fontSize: 11, fontWeight: '700', color: palette.brand[400], letterSpacing: 1, marginBottom: 6 },
  sub: { fontSize: 12, color: palette.gray[400], marginBottom: 16, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.gray[700],
    backgroundColor: palette.gray[800],
  },
  btnActive: { backgroundColor: palette.brand[600], borderColor: palette.brand[500] },
  btnText: { fontSize: 14, fontWeight: '700', color: palette.gray[300] },
  btnTextActive: { color: palette.white },
});
