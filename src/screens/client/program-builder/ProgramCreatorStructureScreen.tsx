import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, palette } from '../../../theme';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProgramBuilderStore } from '../../../store/useProgramBuilderStore';

import { RootStackParamList } from '../../../navigation/AppNavigator';
export const ProgramCreatorStructureScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { draft, generateBlocks } = useProgramBuilderStore();
  const { t } = useTranslation();

  const [localBlocks, setLocalBlocks] = useState<{name: string, weeks: number}[]>(
      draft.blocks.length > 0 
      ? draft.blocks.map(b => ({ name: b.name, weeks: b.durationWeeks }))
      : [{ name: t('programBuilder.defaultPhaseName', { n: 1 }), weeks: draft.durationWeeks }]
  );

  const totalAllocatedWeeks = localBlocks.reduce((sum, b) => sum + b.weeks, 0);
  const weeksRemaining = draft.durationWeeks - totalAllocatedWeeks;

  const handleAddBlock = () => {
      if (weeksRemaining <= 0) {
          Alert.alert(t('programBuilder.allWeeksAllocatedTitle'), t('programBuilder.allWeeksAllocatedMsg'));
          return;
      }
      setLocalBlocks([...localBlocks, { name: t('programBuilder.defaultPhaseName', { n: localBlocks.length + 1 }), weeks: weeksRemaining }]);
  };

  const handleUpdateBlockWeeks = (index: number, delta: number) => {
      const newBlocks = [...localBlocks];
      const newWeeks = newBlocks[index].weeks + delta;
      
      if (newWeeks < 1) return; // Must have at least 1 week
      if (delta > 0 && weeksRemaining <= 0) return; // Can't add if no weeks remaining

      newBlocks[index].weeks = newWeeks;
      setLocalBlocks(newBlocks);
  };

  const handleDeleteBlock = (index: number) => {
      if (localBlocks.length === 1) {
          Alert.alert(t('programBuilder.waitTitle'), t('programBuilder.atLeastOneBlock'));
          return;
      }
      const newBlocks = localBlocks.filter((_, i) => i !== index);
      setLocalBlocks(newBlocks);
  };

  const handleGenerateAndContinue = () => {
      if (weeksRemaining !== 0) {
          Alert.alert(t('programBuilder.unallocatedTitle'), t('programBuilder.unallocatedMsg', { count: weeksRemaining, total: draft.durationWeeks }));
          return;
      }
      
      // If the structure changed, this will completely wipe existing days/exercises. 
      // We should warn them if they backtracked.
      if (draft.blocks.length > 0) {
          Alert.alert(
              t('common.warning'),
              t('programBuilder.resetStructureMsg'),
              [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('programBuilder.resetStructure'), style: 'destructive', onPress: () => {
                      generateBlocks(localBlocks);
                      navigation.navigate('ProgramCreatorWeeks');
                  }}
              ]
          );
      } else {
          generateBlocks(localBlocks);
          navigation.navigate('ProgramCreatorWeeks');
      }
  };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <View style={styles.backBtn} />
            <Text style={styles.headerTitle}>{t('programBuilder.blockStructure')}</Text>
            <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.progressBox}>
                <Text style={styles.progressLabel}>{t('programBuilder.weeksAllocated')}</Text>
                <Text style={styles.progressNumbers}>
                    <Text style={{ color: weeksRemaining === 0 ? palette.brand[500] : palette.white }}>{totalAllocatedWeeks}</Text>
                    <Text style={{ color: palette.gray[500] }}> / {draft.durationWeeks}</Text>
                </Text>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.min(100, (totalAllocatedWeeks / draft.durationWeeks) * 100)}%`, backgroundColor: weeksRemaining === 0 ? palette.brand[500] : palette.gray[300] }]} />
                </View>
                {weeksRemaining !== 0 && (
                    <Text style={styles.warningText}>{t('programBuilder.weeksLeft', { count: weeksRemaining })}</Text>
                )}
            </View>

            <Text style={styles.instructions}>
                {t('programBuilder.structureInstructions', { count: draft.durationWeeks })}
            </Text>

            {localBlocks.map((block, index) => (
                <View key={index} style={styles.blockCard}>
                    <View style={styles.blockCardHeader}>
                        <Text style={styles.blockCardTitle}>{t('programBuilder.blockN', { n: index + 1 })}</Text>
                        <TouchableOpacity
                            onPress={() => handleDeleteBlock(index)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel={t('programBuilder.deleteBlockA11y', { n: index + 1 })}
                        >
                            <Text style={styles.deleteIcon}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.blockRow}>
                        <View style={styles.blockNameWrap}>
                            <Text style={styles.label}>{t('programBuilder.phaseName')}</Text>
                            <Text style={styles.blockNameVal}>{block.name}</Text>
                        </View>
                        
                        <View style={styles.counterWrap}>
                            <Text style={[styles.label, { textAlign: 'center' }]}>{t('programBuilder.weeks')}</Text>
                            <View style={styles.counterControls}>
                                <TouchableOpacity
                                    style={styles.counterBtn}
                                    onPress={() => handleUpdateBlockWeeks(index, -1)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('programBuilder.fewerWeekA11y', { n: index + 1 })}
                                >
                                    <Text style={styles.counterBtnText}>-</Text>
                                </TouchableOpacity>
                                <Text style={styles.counterVal}>{block.weeks}</Text>
                                <TouchableOpacity
                                    style={[styles.counterBtn, weeksRemaining === 0 && { opacity: 0.3 }]}
                                    onPress={() => handleUpdateBlockWeeks(index, 1)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={t('programBuilder.moreWeekA11y', { n: index + 1 })}
                                    accessibilityState={{ disabled: weeksRemaining === 0 }}
                                >
                                    <Text style={styles.counterBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            ))}

            <TouchableOpacity accessibilityRole="button" style={styles.addBlockBtn} onPress={handleAddBlock}>
                <Text style={styles.addBlockText}>{t('programBuilder.addBlock')}</Text>
            </TouchableOpacity>

        </ScrollView>

        <View style={styles.footer}>
            <TouchableOpacity
                accessibilityRole="button" 
                style={[styles.nextBtn, weeksRemaining !== 0 && { opacity: 0.5 }]} 
                onPress={handleGenerateAndContinue}
            >
                <Text style={styles.nextBtnText}>{t('programBuilder.nextConfigureDays')}</Text>
            </TouchableOpacity>
        </View>
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
  headerTitle: { color: palette.white, fontSize: 18, fontWeight: 'bold' },
  content: { paddingHorizontal: 20, paddingBottom: 100 },
  
  progressBox: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.cardElevated,
      marginBottom: 24,
  },
  progressLabel: { color: palette.gray[400], fontSize: 14, marginBottom: 8 },
  progressNumbers: { fontSize: 32, fontWeight: 'bold', marginBottom: 12 },
  progressBar: { height: 6, backgroundColor: theme.colors.cardElevated, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  warningText: { color: palette.error[400], fontSize: 12, marginTop: 12 },

  instructions: { color: palette.gray[400], fontSize: 14, marginBottom: 20, lineHeight: 20 },

  blockCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.cardElevated,
      marginBottom: 16,
  },
  blockCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  blockCardTitle: { color: palette.white, fontSize: 16, fontWeight: 'bold' },
  deleteIcon: { color: palette.gray[500], fontSize: 18 },
  
  blockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockNameWrap: { flex: 1 },
  label: { color: palette.gray[400], fontSize: 12, marginBottom: 8 },
  blockNameVal: { color: palette.white, fontSize: 18, fontWeight: '500' },
  
  counterWrap: { alignItems: 'center' },
  counterControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.cardElevated, borderRadius: 12, padding: 4 },
  counterBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.zinc[700], borderRadius: 8 },
  counterBtnText: { color: palette.white, fontSize: 20 },
  counterVal: { color: palette.white, fontSize: 16, fontWeight: 'bold', width: 40, textAlign: 'center' },

  addBlockBtn: {
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: theme.colors.cardElevated,
      borderRadius: 16,
      borderStyle: 'dashed',
      alignItems: 'center',
      marginBottom: 40,
  },
  addBlockText: { color: palette.brand[500], fontSize: 14, fontWeight: 'bold' },

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
