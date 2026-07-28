import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, palette } from '../../../theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProgramBuilderStore } from '../../../store/useProgramBuilderStore';

export const ProgramCreatorStartScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { draft, setOverview } = useProgramBuilderStore();

  const handleNext = () => {
      // Validate inputs
      if (!draft.title.trim() || draft.durationWeeks < 1) {
          import('react-native').then(({ Alert }) => {
              Alert.alert('Validation Error', 'Please provide a title and valid duration.');
          });
          return;
      }
      
      navigation.navigate('ProgramCreatorStructure');
  };

  return (
    <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backIcon}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Program</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.screenTitle}>Let's build something epic.</Text>
                <Text style={styles.screenSubtitle}>Define the high-level goals of your new training program before we zoom into the day-to-day.</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Program Title</Text>
                    <TextInput 
                        style={styles.input}
                        placeholder="e.g., Summer Shredding, 5x5 Power..."
                        placeholderTextColor={palette.gray[500]}
                        value={draft.title}
                        onChangeText={(text) => setOverview({ title: text })}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Goal</Text>
                    <View style={styles.chipRow}>
                        {['HYPERTROPHY', 'STRENGTH', 'FAT_LOSS', 'ENDURANCE'].map(goal => (
                            <TouchableOpacity 
                                key={goal} 
                                onPress={() => setOverview({ goal })}
                                style={[styles.chip, draft.goal === goal && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, draft.goal === goal && styles.chipTextActive]}>
                                    {goal.replace('_', ' ')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Experience Level</Text>
                    <View style={styles.chipRow}>
                        {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map(diff => (
                            <TouchableOpacity 
                                key={diff} 
                                onPress={() => setOverview({ difficulty: diff })}
                                style={[styles.chip, draft.difficulty === diff && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, draft.difficulty === diff && styles.chipTextActive]}>{diff}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Total Length (Weeks)</Text>
                    <TextInput 
                        style={styles.input}
                        keyboardType="number-pad"
                        placeholder="e.g., 12"
                        placeholderTextColor={palette.gray[500]}
                        value={draft.durationWeeks ? String(draft.durationWeeks) : ''}
                        onChangeText={(text) => setOverview({ durationWeeks: parseInt(text) || 0 })}
                    />
                </View>

                <View style={[styles.inputGroup, { marginTop: 20 }]}>
                    <Text style={styles.label}>Description (Optional)</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea]}
                        multiline
                        numberOfLines={4}
                        placeholder="What is this program focused on?"
                        placeholderTextColor={palette.gray[500]}
                        value={draft.description || ''}
                        onChangeText={(text) => setOverview({ description: text })}
                    />
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                    <Text style={styles.nextBtnText}>Next Step: Build Blocks →</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { color: palette.white, fontSize: 24 },
  headerTitle: { color: palette.white, fontSize: 18, fontWeight: 'bold' },
  content: { paddingHorizontal: 20, paddingBottom: 100 },
  screenTitle: { color: palette.white, fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  screenSubtitle: { color: palette.gray[400], fontSize: 14, marginBottom: 32 },
  inputGroup: { marginBottom: 24 },
  label: { color: palette.gray[300], fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardElevated,
    borderRadius: 12,
    color: palette.white,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardElevated,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: palette.brand[500] + '33',
    borderColor: palette.brand[500],
  },
  chipText: { color: palette.gray[400], fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: palette.brand[500], fontWeight: 'bold' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardElevated,
  },
  nextBtn: {
    backgroundColor: palette.brand[500],
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: { color: palette.black, fontSize: 16, fontWeight: 'bold' },
});
