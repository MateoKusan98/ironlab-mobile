// The question inputs themselves. Shared by the onboarding wizard and the
// settings screen so a question looks and behaves the same wherever it is edited.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { palette } from '../../../theme';
import { FormValue, FormValues, asNumber, asOptionalText, asStringList, asText, asTriState } from '@shared';
import { DONT_KNOW, Option, Question, TFunction } from './questions';

const SingleChoice = ({ options, value, onChange }: { options: Option[]; value: string; onChange: (v: string) => void }) => (
  <View style={q.optionList}>
    {options.map((opt) => {
      const selected = value === opt.value;
      return (
        <TouchableOpacity key={opt.value} style={[q.optionCard, selected && q.optionSelected]} onPress={() => onChange(opt.value)}>
          <Text style={[q.optionText, selected && q.optionTextSelected]}>
            {opt.icon ? `${opt.icon}  ` : ''}{opt.label}
          </Text>
          <View style={[q.radio, selected && q.radioSelected]}>
            {selected && <View style={q.radioInner} />}
          </View>
        </TouchableOpacity>
      );
    })}
  </View>
);

const MultiChoice = ({ options, value, onChange }: { options: Option[]; value: string[]; onChange: (v: string[]) => void }) => (
  <View style={q.chipWrap}>
    {options.map((opt) => {
      const selected = value.includes(opt.value);
      return (
        <TouchableOpacity
          key={opt.value}
          style={[q.chip, selected && q.chipSelected]}
          onPress={() => {
            if (selected) onChange(value.filter((v) => v !== opt.value));
            else onChange([...value, opt.value]);
          }}
        >
          {opt.icon && <Text style={q.chipIcon}>{opt.icon}</Text>}
          <Text style={[q.chipText, selected && q.chipTextSelected]}>{opt.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const NumberInput = ({ value, onChange, unit, placeholder }: { value: string | number; onChange: (v: string) => void; unit?: string; placeholder?: string; min?: number; max?: number }) => (
  <View style={q.numberRow}>
    <TextInput
      style={q.numberInput}
      // TextInput needs a string; int columns prefill as JS numbers (decimals arrive as strings), so coerce.
      value={String(value ?? '')}
      onChangeText={onChange}
      keyboardType="numeric"
      placeholder={placeholder ?? '0'}
      placeholderTextColor={palette.gray[600]}
    />
    {unit && <Text style={q.numberUnit}>{unit}</Text>}
  </View>
);

const BoolInput = ({ value, onChange, trueLabel = 'Yes', falseLabel = 'No' }: { value: boolean | null; onChange: (v: boolean) => void; trueLabel?: string; falseLabel?: string }) => (
  <View style={{ flexDirection: 'row', gap: 12 }}>
    {[true, false].map((v) => (
      <TouchableOpacity
        key={String(v)}
        style={[q.boolBtn, value === v && q.boolBtnSelected]}
        onPress={() => onChange(v)}
      >
        <Text style={[q.boolText, value === v && q.boolTextSelected]}>{v ? trueLabel : falseLabel}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const SliderInput = ({ value, onChange, min = 1, max = 5 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) => (
  <View style={q.sliderRow}>
    {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((v) => (
      <TouchableOpacity key={v} style={[q.sliderDot, value >= v && q.sliderDotActive]} onPress={() => onChange(v)}>
        <Text style={[q.sliderDotText, value >= v && q.sliderDotTextActive]}>{v}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const FOCUS_TICKS = [
  'hypertrophy',
  'hypertrophy_leaning',
  'powerbuilding',
  'strength_leaning',
  'strength',
] as const;

const FocusSlider = ({ value, onChange, t }: { value: string; onChange: (v: string) => void; t: TFunction }) => (
  <View style={fs.wrap}>
    {/* Track + dots */}
    <View style={fs.trackRow}>
      <View style={fs.trackBg} />
      <View style={fs.dotsRow}>
        {FOCUS_TICKS.map((tick) => {
          const active = value === tick;
          return (
            <TouchableOpacity key={tick} onPress={() => onChange(tick)} style={fs.dotTouch} activeOpacity={0.7}>
              <View style={[fs.dot, active && fs.dotActive]}>
                {active && <View style={fs.dotInner} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
    {/* Anchor labels */}
    <View style={fs.labelRow}>
      <Text style={[fs.label, fs.labelLeft, (value === 'hypertrophy' || value === 'hypertrophy_leaning') && fs.labelActive]}>
        {t('aiCoachExtendedSetup.focusHypertrophy')}
      </Text>
      <Text style={[fs.label, fs.labelCenter, value === 'powerbuilding' && fs.labelActive]}>
        {t('aiCoachExtendedSetup.focusPowerbuilding')}
      </Text>
      <Text style={[fs.label, fs.labelRight, (value === 'strength' || value === 'strength_leaning') && fs.labelActive]}>
        {t('aiCoachExtendedSetup.focusStrength')}
      </Text>
    </View>
  </View>
);

// ─── Competition / PR-test date field ────────────────────────────────────────
// Mirrors the quick-pick + month-picker UX of CompDateModal so setting a target
// date feels identical wherever the athlete does it. Stores competitionDate as an
// ISO 'YYYY-MM-DD' string (or null) and competitionType as 'meet' | 'pr_test'.

const CD_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CD_QUICK_WEEKS = [4, 8, 12, 16, 20, 24];
const cdAddWeeks = (n: number): Date => new Date(Date.now() + n * 7 * 86_400_000);
const cdToISO = (d: Date): string => d.toISOString().split('T')[0];

const CompDateField = ({
  date,
  type,
  onChange,
  t,
}: {
  date: string | null;
  type: 'meet' | 'pr_test' | null;
  onChange: (date: string | null, type: 'meet' | 'pr_test' | null) => void;
  t: TFunction;
}) => {
  const selected = date ? new Date(date) : null;

  const monthOptions: { label: string; date: Date }[] = [];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    monthOptions.push({ label: `${CD_MONTHS[d.getMonth()]} ${d.getFullYear()}`, date: d });
  }

  const pickType = (next: 'meet' | 'pr_test' | null) => {
    if (next === null) onChange(null, null);
    else onChange(date, next);
  };

  return (
    <View>
      <View style={cd.typeRow}>
        <TouchableOpacity
          style={[cd.typeBtn, !type && cd.typeBtnActive]}
          onPress={() => pickType(null)}
        >
          <Text style={[cd.typeText, !type && cd.typeTextActive]}>{t('aiCoachExtendedSetup.compDateNone')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[cd.typeBtn, type === 'meet' && cd.typeBtnActive]}
          onPress={() => pickType('meet')}
        >
          <Text style={[cd.typeText, type === 'meet' && cd.typeTextActive]}>{t('aiCoach.competition.meet')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[cd.typeBtn, type === 'pr_test' && cd.typeBtnActive]}
          onPress={() => pickType('pr_test')}
        >
          <Text style={[cd.typeText, type === 'pr_test' && cd.typeTextActive]}>{t('aiCoach.competition.prTest')}</Text>
        </TouchableOpacity>
      </View>

      {type && (
        <>
          <Text style={cd.sectionLabel}>{t('aiCoach.competition.quickPick')}</Text>
          <View style={cd.quickRow}>
            {CD_QUICK_WEEKS.map((w) => {
              const d = cdAddWeeks(w);
              const active = selected && Math.abs(selected.getTime() - d.getTime()) < 3 * 86_400_000;
              return (
                <TouchableOpacity
                  key={w}
                  style={[cd.quickBtn, active && cd.quickBtnActive]}
                  onPress={() => onChange(cdToISO(d), type)}
                >
                  <Text style={[cd.quickWks, active && cd.quickTextActive]}>{w}wk</Text>
                  <Text style={[cd.quickMonth, active && cd.quickTextActive]}>{CD_MONTHS[d.getMonth()]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={cd.sectionLabel}>{t('aiCoach.competition.pickMonth')}</Text>
          <View style={cd.monthWrap}>
            {monthOptions.map(({ label, date: d }) => {
              const active = selected &&
                selected.getMonth() === d.getMonth() &&
                selected.getFullYear() === d.getFullYear();
              return (
                <TouchableOpacity
                  key={label}
                  style={[cd.monthChip, active && cd.monthChipActive]}
                  onPress={() => onChange(cdToISO(d), type)}
                >
                  <Text style={[cd.monthText, active && cd.monthTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
};

const cd = StyleSheet.create({
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: palette.gray[700], alignItems: 'center',
  },
  typeBtnActive: { borderColor: palette.brand[500], backgroundColor: palette.brand[500] + '22' },
  typeText: { color: palette.gray[300], fontSize: 13, fontWeight: '600' },
  typeTextActive: { color: palette.brand[400], fontWeight: '700' },
  sectionLabel: { color: palette.gray[400], fontSize: 12, fontWeight: '600', marginTop: 18, marginBottom: 8 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: 1, borderColor: palette.gray[700], alignItems: 'center',
  },
  quickBtnActive: { borderColor: palette.brand[500], backgroundColor: palette.brand[500] + '22' },
  quickWks: { color: palette.gray[200], fontSize: 13, fontWeight: '700' },
  quickMonth: { color: palette.gray[500], fontSize: 10 },
  quickTextActive: { color: palette.brand[400] },
  monthWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthChip: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
    borderWidth: 1, borderColor: palette.gray[700],
  },
  monthChipActive: { borderColor: palette.brand[500], backgroundColor: palette.brand[500] + '22' },
  monthText: { color: palette.gray[300], fontSize: 12 },
  monthTextActive: { color: palette.brand[400], fontWeight: '700' },
});

const fs = StyleSheet.create({
  wrap: { marginVertical: 4 },
  trackRow: { height: 40, justifyContent: 'center' },
  trackBg: {
    position: 'absolute',
    top: 19,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: palette.gray[700],
    borderRadius: 1,
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dotTouch: { padding: 8 },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: palette.gray[600],
    backgroundColor: palette.gray[900],
    alignItems: 'center', justifyContent: 'center',
  },
  dotActive: { borderColor: palette.brand[500], backgroundColor: palette.brand[500] },
  dotInner: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.white },
  labelRow: { flexDirection: 'row', marginTop: 4 },
  label: { fontSize: 12, fontWeight: '700', color: palette.gray[500] },
  labelLeft: { flex: 1, textAlign: 'left' },
  labelCenter: { flex: 1, textAlign: 'center' },
  labelRight: { flex: 1, textAlign: 'right' },
  labelActive: { color: palette.brand[400] },
});

const q = StyleSheet.create({
  optionList: { gap: 10 },
  optionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.gray[900], borderRadius: 14, padding: 16, borderWidth: 1, borderColor: palette.gray[800] },
  optionSelected: { borderColor: palette.brand[600], backgroundColor: 'rgba(234,88,12,0.08)' },
  optionText: { color: palette.gray[300], fontSize: 14, fontWeight: '600' },
  optionTextSelected: { color: palette.brand[400] },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: palette.gray[600], alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: palette.brand[500], backgroundColor: palette.brand[500] },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.white },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: palette.gray[900], borderWidth: 1, borderColor: palette.gray[700], flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipSelected: { borderColor: palette.brand[500], backgroundColor: 'rgba(234,88,12,0.12)' },
  chipIcon: { fontSize: 14 },
  chipText: { color: palette.gray[400], fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: palette.brand[400] },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numberInput: { backgroundColor: palette.gray[900], borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14, color: palette.white, fontSize: 24, fontWeight: '700', borderWidth: 1, borderColor: palette.gray[700], minWidth: 100, textAlign: 'center' },
  numberUnit: { color: palette.gray[400], fontSize: 16 },
  boolBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: palette.gray[900], borderWidth: 1, borderColor: palette.gray[700], alignItems: 'center' },
  boolBtnSelected: { borderColor: palette.brand[500], backgroundColor: 'rgba(234,88,12,0.12)' },
  boolText: { color: palette.gray[400], fontSize: 15, fontWeight: '700' },
  boolTextSelected: { color: palette.brand[400] },
  sliderRow: { flexDirection: 'row', gap: 10 },
  sliderDot: { flex: 1, aspectRatio: 1, borderRadius: 12, backgroundColor: palette.gray[900], borderWidth: 1, borderColor: palette.gray[700], alignItems: 'center', justifyContent: 'center' },
  sliderDotActive: { backgroundColor: 'rgba(234,88,12,0.15)', borderColor: palette.brand[500] },
  sliderDotText: { color: palette.gray[500], fontSize: 16, fontWeight: '700' },
  sliderDotTextActive: { color: palette.brand[400] },
});


const f = StyleSheet.create({
  textArea: { backgroundColor: palette.gray[900], borderRadius: 12, padding: 14, color: palette.white, fontSize: 14, borderWidth: 1, borderColor: palette.gray[700], minHeight: 80, textAlignVertical: 'top' },
  textAreaLarge: { minHeight: 200, fontSize: 13 },
  dontKnowBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.gray[600],
    alignSelf: 'flex-start',
  },
  dontKnowBtnActive: {
    borderColor: palette.brand[500],
    borderStyle: 'solid',
    backgroundColor: 'rgba(234,88,12,0.08)',
  },
  dontKnowText: { fontSize: 13, color: palette.gray[500], fontWeight: '600' },
  dontKnowTextActive: { color: palette.brand[400] },
});

/**
 * One question's input, driven entirely by its config entry. `answers` (not just
 * this question's value) is passed in because the competition-date field writes two
 * keys at once and reads both back.
 */
export const QuestionField = ({
  question,
  answers,
  onChange,
  t,
}: {
  question: Question;
  answers: FormValues;
  onChange: (patch: FormValues) => void;
  t: TFunction;
}) => {
  const { id, type, options = [], min, max, unit, placeholder, allowDontKnow, trueLabel, falseLabel } = question;
  const get = (key: string, def: FormValue = ''): FormValue => answers[key] ?? def;
  const set = (value: FormValue) => onChange({ [id]: value });
  const notSure = answers[id] === DONT_KNOW;

  const input = (() => {
    switch (type) {
      case 'single':
        return <SingleChoice options={options} value={notSure ? '' : asText(get(id))} onChange={set} />;
      case 'multi':
        return <MultiChoice options={options} value={asStringList(get(id, []))} onChange={set} />;
      case 'number':
        return <NumberInput value={asText(get(id))} onChange={set} unit={unit} placeholder={placeholder} min={min} max={max} />;
      case 'text':
        return (
          <TextInput
            style={f.textArea}
            value={asText(get(id))}
            onChangeText={set}
            placeholder={placeholder}
            placeholderTextColor={palette.gray[600]}
            multiline
            numberOfLines={3}
          />
        );
      case 'longtext':
        return (
          <TextInput
            style={[f.textArea, f.textAreaLarge]}
            value={asText(get(id))}
            onChangeText={set}
            placeholder={placeholder}
            placeholderTextColor={palette.gray[600]}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
        );
      case 'bool':
        return (
          <BoolInput
            value={notSure ? null : asTriState(get(id, null))}
            onChange={set}
            trueLabel={trueLabel ?? (id === 'prefersStructure' ? t('aiCoachExtendedSetup.optionRigidStructure') : t('common.yes'))}
            falseLabel={falseLabel ?? (id === 'prefersStructure' ? t('aiCoachExtendedSetup.optionFlexible') : t('common.no'))}
          />
        );
      case 'slider':
        return <SliderInput value={asNumber(get(id, min ?? 1)) ?? min ?? 1} onChange={set} min={min} max={max} />;
      case 'focus_slider':
        return <FocusSlider value={asText(get(id, ''))} onChange={set} t={t} />;
      case 'comp_date':
        return (
          <CompDateField
            date={asOptionalText(get('competitionDate', null))}
            // The field only ever stores these two literals; validate rather
            // than assert, so a stale saved answer can't smuggle in anything else.
            type={
              asOptionalText(get('competitionType', null)) === 'meet' ? 'meet'
              : asOptionalText(get('competitionType', null)) === 'pr_test' ? 'pr_test'
              : null
            }
            onChange={(d, ty) => onChange({ competitionDate: d, competitionType: ty })}
            t={t}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <>
      {input}
      {allowDontKnow && (
        <TouchableOpacity
          style={[f.dontKnowBtn, notSure && f.dontKnowBtnActive]}
          onPress={() => onChange({ [id]: notSure ? '' : DONT_KNOW })}
          accessibilityRole="button"
          accessibilityState={{ selected: notSure }}
        >
          <Text style={[f.dontKnowText, notSure && f.dontKnowTextActive]}>
            {notSure ? t('aiCoachExtendedSetup.notSureYet') : t('aiCoachExtendedSetup.dontKnow')}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
};
