import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, palette, alpha } from '../../../theme';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProgramBuilderStore } from '../../../store/useProgramBuilderStore';
import { useCreateProgram } from '../../../hooks/useWorkout';

import { RootStackParamList } from '../../../navigation/AppNavigator';
export const ProgramCreatorWeeksScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { draft, copyWeek, resetDraft } = useProgramBuilderStore();
  const createProgramMutation = useCreateProgram();
  const { t } = useTranslation();

  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [sourceWeek, setSourceWeek] = useState<{bIdx: number, wIdx: number} | null>(null);
  const [targetWeek, setTargetWeek] = useState<{bIdx: number, wIdx: number} | null>(null);

  const openCopyModal = (targetBIdx: number, targetWIdx: number) => {
      setTargetWeek({ bIdx: targetBIdx, wIdx: targetWIdx });
      setCopyModalVisible(true);
  };

  const handleCopySubmit = () => {
      if (sourceWeek && targetWeek) {
          copyWeek(sourceWeek.bIdx, sourceWeek.wIdx, targetWeek.bIdx, targetWeek.wIdx);
          Alert.alert(t('common.success'), t('programBuilder.weekCopied'));
      }
      setCopyModalVisible(false);
      setSourceWeek(null);
      setTargetWeek(null);
  };

  const navigateToDay = (bIdx: number, wIdx: number, dIdx: number) => {
      navigation.navigate('ProgramCreatorDay', { blockIndex: bIdx, weekIndex: wIdx, dayIndex: dIdx });
  };

  const handlePublish = () => {
    createProgramMutation.mutate(draft, {
      onSuccess: () => {
        Alert.alert(t('common.success'), t('programBuilder.programCreated'));
        resetDraft();
        navigation.navigate('ClientApp'); // Return to main dashboard
      },
      onError: (err) => {
        Alert.alert(t('common.error'), t('programBuilder.createFailed', { error: String(err) }));
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <View style={styles.backBtn} />
            <Text style={styles.headerTitle}>{t('programBuilder.configureDays')}</Text>
            <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
            {draft.blocks.map((block, bIdx) => (
                <View key={block.id} style={styles.blockSection}>
                    <View style={styles.blockHeader}>
                        <Text style={styles.blockTitle}>{block.name}</Text>
                        <Text style={styles.blockMeta}>{t('programBuilder.blockWeeks', { count: block.durationWeeks })}</Text>
                    </View>

                    {block.weeks.map((week, wIdx) => (
                        <View key={week.id} style={styles.weekCard}>
                            <View style={styles.weekHeader}>
                                <Text style={styles.weekTitle}>{week.name}</Text>
                                <TouchableOpacity accessibilityRole="button" style={styles.copyBtn} onPress={() => openCopyModal(bIdx, wIdx)}>
                                    <Text style={styles.copyBtnText}>{t('programBuilder.copyFrom')}</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
                                {week.days.map((day, dIdx) => {
                                    const exercisesCount = day.exercises.length;
                                    const isConfigured = exercisesCount > 0;

                                    return (
                                        <TouchableOpacity
                                            accessibilityRole="button" 
                                            key={day.id} 
                                            style={[styles.dayCircle, isConfigured && styles.dayCircleConfigured, day.isRestDay && styles.dayCircleRest]}
                                            onPress={() => navigateToDay(bIdx, wIdx, dIdx)}
                                        >
                                            <Text style={[styles.dayNumber, isConfigured && styles.dayTextActive]}>{t('programBuilder.dayN', { n: day.dayNumber })}</Text>
                                            {isConfigured ? (
                                                <Text style={styles.dayStatus}>{t('programBuilder.exercisesCount', { count: exercisesCount })}</Text>
                                            ) : day.isRestDay ? (
                                                <Text style={styles.dayStatus}>{t('programBuilder.rest')}</Text>
                                            ) : (
                                                <Text style={styles.dayStatus}>{t('programBuilder.empty')}</Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    ))}
                </View>
            ))}
        </ScrollView>

        <View style={styles.footer}>
            <TouchableOpacity 
                style={[styles.publishBtn, createProgramMutation.isPending && { opacity: 0.5 }]} 
                onPress={handlePublish}
                disabled={createProgramMutation.isPending}
                accessibilityRole="button"
                accessibilityLabel={t('programBuilder.publishProgram')}
                accessibilityState={{ disabled: createProgramMutation.isPending, busy: createProgramMutation.isPending }}
            >
                <Text style={styles.publishBtnText}>
                    {createProgramMutation.isPending ? t('programBuilder.publishing') : t('programBuilder.publishProgram')}
                </Text>
            </TouchableOpacity>
        </View>

        {/* Copy Modal */}
        <Modal
            animationType="slide"
            transparent={true}
            visible={copyModalVisible}
            onRequestClose={() => setCopyModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{t('programBuilder.copyWeekTitle')}</Text>
                    <Text style={styles.modalText}>{t('programBuilder.copyWeekText')}</Text>
                    
                    <Text style={styles.modalLabel}>{t('programBuilder.selectSource')}</Text>
                    <ScrollView style={{ maxHeight: 200, marginBottom: 20 }}>
                        {draft.blocks.map((b, bI) => (
                            b.weeks.map((w, wI) => {
                                const isTarget = targetWeek?.bIdx === bI && targetWeek?.wIdx === wI;
                                const isSelected = sourceWeek?.bIdx === bI && sourceWeek?.wIdx === wI;
                                if (isTarget) return null; // Can't copy target onto itself
                                
                                return (
                                    <TouchableOpacity
                                        accessibilityRole="button" 
                                        key={w.id} 
                                        style={[styles.sourceOption, isSelected && styles.sourceOptionSelected]}
                                        onPress={() => setSourceWeek({ bIdx: bI, wIdx: wI })}
                                    >
                                        <Text style={[styles.sourceOptionText, isSelected && styles.sourceOptionTextSelected]}>
                                            {b.name} - {w.name}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })
                        ))}
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity accessibilityRole="button" style={styles.modalBtnCancel} onPress={() => setCopyModalVisible(false)}>
                            <Text style={styles.modalBtnTextCancel}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            accessibilityRole="button" 
                            style={[styles.modalBtnSubmit, !sourceWeek && { opacity: 0.5 }]} 
                            disabled={!sourceWeek}
                            onPress={handleCopySubmit}
                        >
                            <Text style={styles.modalBtnTextSubmit}>{t('programBuilder.confirmCopy')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

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
  
  blockSection: { marginBottom: 32 },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  blockTitle: { color: palette.brand[500], fontSize: 20, fontWeight: 'bold' },
  blockMeta: { color: palette.gray[500], fontSize: 12 },

  weekCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.cardElevated,
      marginBottom: 16,
  },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  weekTitle: { color: palette.white, fontSize: 16, fontWeight: 'bold' },
  copyBtn: { backgroundColor: theme.colors.cardElevated, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  copyBtnText: { color: palette.gray[300], fontSize: 10, fontWeight: 'bold' },

  daysScroll: { gap: 12 },
  dayCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: palette.zinc[700],
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
  },
  dayCircleConfigured: { borderColor: palette.brand[500], backgroundColor: palette.brand[500] + '11' },
  dayCircleRest: { borderColor: palette.coolGray[600], backgroundColor: palette.coolGray[800] },
  dayNumber: { color: palette.gray[400], fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  dayTextActive: { color: palette.brand[400] },
  dayStatus: { color: palette.gray[500], fontSize: 9 },

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
  publishBtn: {
    backgroundColor: palette.white,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  publishBtnText: { color: palette.black, fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: alpha(palette.black, 0.7), justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { color: palette.white, fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalText: { color: palette.gray[400], fontSize: 14, marginBottom: 24, lineHeight: 20 },
  modalLabel: { color: palette.gray[300], fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  
  sourceOption: { padding: 16, backgroundColor: theme.colors.background, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.cardElevated, marginBottom: 8 },
  sourceOptionSelected: { borderColor: palette.brand[500], backgroundColor: palette.brand[500] + '22' },
  sourceOptionText: { color: palette.white, fontSize: 14 },
  sourceOptionTextSelected: { color: palette.brand[500], fontWeight: 'bold' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  modalBtnCancel: { flex: 1, paddingVertical: 16, backgroundColor: theme.colors.cardElevated, borderRadius: 12, alignItems: 'center' },
  modalBtnTextCancel: { color: palette.white, fontWeight: 'bold' },
  modalBtnSubmit: { flex: 1, paddingVertical: 16, backgroundColor: palette.brand[500], borderRadius: 12, alignItems: 'center' },
  modalBtnTextSubmit: { color: palette.black, fontWeight: 'bold' },
});
