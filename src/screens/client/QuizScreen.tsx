import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { X, Brain, Barbell, ForkKnife } from 'phosphor-react-native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { FitnessQuiz } from '../../components/ui/FitnessQuiz';
import { Button } from '../../components/ui/Button';
import { theme, palette } from '../../theme';

const LENGTHS = [
  { label: 'Quick · 5', value: 5 },
  { label: 'Standard · 10', value: 10 },
  { label: 'Marathon · 20', value: 20 },
];

export const QuizScreen: React.FC = () => {
  const navigation = useNavigation();
  const [limit, setLimit] = useState<number | null>(null);

  const close = (
    <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
      <X size={24} weight="bold" color={theme.colors.text} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader left={<View />} title="Fitness Quiz" right={close} />

      {limit === null ? (
        <ScrollView contentContainerStyle={styles.intro} showsVerticalScrollIndicator={false}>
          <View style={styles.iconCircle}>
            <Brain size={44} weight="fill" color={palette.brand[400]} />
          </View>
          <Text style={styles.heroTitle}>Test your fitness IQ</Text>
          <Text style={styles.heroSub}>
            100+ questions on training, nutrition, anatomy, recovery and the myths everyone gets
            wrong. Answer and learn — we show you why.
          </Text>

          <View style={styles.tags}>
            <View style={styles.tag}>
              <Barbell size={16} weight="fill" color={palette.brand[400]} />
              <Text style={styles.tagText}>Training</Text>
            </View>
            <View style={styles.tag}>
              <ForkKnife size={16} weight="fill" color="#34d399" />
              <Text style={styles.tagText}>Nutrition</Text>
            </View>
          </View>

          <Text style={styles.pick}>How many questions?</Text>
          {LENGTHS.map((l) => (
            <Button
              key={l.value}
              label={l.label}
              variant="outline"
              color="brand"
              onPress={() => setLimit(l.value)}
              isFullWidth
              style={{ marginBottom: theme.spacing.sm }}
            />
          ))}
        </ScrollView>
      ) : (
        <FitnessQuiz
          questionLimit={limit}
          title="Fitness Quiz"
          subtitle="Pick the right answer"
          onFinish={() => setLimit(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  intro: { padding: theme.spacing.xl, alignItems: 'center' },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: theme.borderRadius.full,
    backgroundColor: palette.brand[500] + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  heroTitle: {
    ...theme.typography.displaySm,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.extrabold,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
  heroSub: {
    ...theme.typography.textMd,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: theme.spacing.md,
  },
  tags: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xl, marginBottom: theme.spacing['3xl'] },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.full,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagText: { ...theme.typography.textSm, color: theme.colors.text, fontWeight: theme.fontWeight.medium },
  pick: {
    ...theme.typography.headingSm,
    color: theme.colors.textSecondary,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.md,
    fontWeight: theme.fontWeight.semibold,
  },
});
