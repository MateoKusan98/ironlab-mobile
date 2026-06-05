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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProgramBuilderStore } from '../../../store/useProgramBuilderStore';

export const ProgramCreatorStructureScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { draft, generateBlocks, copyWeek } = useProgramBuilderStore();

  const [localBlocks, setLocalBlocks] = useState<{name: string, weeks: number}[]>(
      draft.blocks.length > 0 
      ? draft.blocks.map(b => ({ name: b.name, weeks: b.durationWeeks }))
      : [{ name: 'Phase 1', weeks: draft.durationWeeks }]
  );

  const totalAllocatedWeeks = localBlocks.reduce((sum, b) => sum + b.weeks, 0);
  const weeksRemaining = draft.durationWeeks - totalAllocatedWeeks;

  const handleAddBlock = () => {
      if (weeksRemaining <= 0) {
          Alert.alert("All Weeks Allocated", "You must reduce the duration of another block to add a new one, or increase total program length.");
          return;
      }
      setLocalBlocks([...localBlocks, { name: `Phase ${localBlocks.length + 1}`, weeks: weeksRemaining }]);
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
          Alert.alert("Wait", "You must have at least one block.");
          return;
      }
      const newBlocks = localBlocks.filter((_, i) => i !== index);
      setLocalBlocks(newBlocks);
  };

  const handleGenerateAndContinue = () => {
      if (weeksRemaining !== 0) {
          Alert.alert("Unallocated Weeks", `You have ${weeksRemaining} weeks unallocated. Please distribute all ${draft.durationWeeks} weeks before continuing.`);
          return;
      }
      
      // If the structure changed, this will completely wipe existing days/exercises. 
      // We should warn them if they backtracked.
      if (draft.blocks.length > 0) {
          Alert.alert(
              "Warning", 
              "Changing the block structure will reset any exercises you've already configured. Continue?",
              [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reset structure', style: 'destructive', onPress: () => {
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
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Block Structure</Text>
            <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.progressBox}>
                <Text style={styles.progressLabel}>Weeks Allocated</Text>
                <Text style={styles.progressNumbers}>
                    <Text style={{ color: weeksRemaining === 0 ? palette.brand[500] : '#FFF' }}>{totalAllocatedWeeks}</Text>
                    <Text style={{ color: palette.gray[500] }}> / {draft.durationWeeks}</Text>
                </Text>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.min(100, (totalAllocatedWeeks / draft.durationWeeks) * 100)}%`, backgroundColor: weeksRemaining === 0 ? palette.brand[500] : palette.gray[300] }]} />
                </View>
                {weeksRemaining !== 0 && (
                    <Text style={styles.warningText}>{weeksRemaining} weeks left to allocate</Text>
                )}
            </View>

            <Text style={styles.instructions}>
                Break your {draft.durationWeeks}-week program into specific phases (Blocks).
            </Text>

            {localBlocks.map((block, index) => (
                <View key={index} style={styles.blockCard}>
                    <View style={styles.blockCardHeader}>
                        <Text style={styles.blockCardTitle}>Block {index + 1}</Text>
                        <TouchableOpacity onPress={() => handleDeleteBlock(index)}>
                            <Text style={styles.deleteIcon}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.blockRow}>
                        <View style={styles.blockNameWrap}>
                            <Text style={styles.label}>Phase Name</Text>
                            <Text style={styles.blockNameVal}>{block.name}</Text>
                        </View>
                        
                        <View style={styles.counterWrap}>
                            <Text style={[styles.label, { textAlign: 'center' }]}>Weeks</Text>
                            <View style={styles.counterControls}>
                                <TouchableOpacity style={styles.counterBtn} onPress={() => handleUpdateBlockWeeks(index, -1)}>
                                    <Text style={styles.counterBtnText}>-</Text>
                                </TouchableOpacity>
                                <Text style={styles.counterVal}>{block.weeks}</Text>
                                <TouchableOpacity style={[styles.counterBtn, weeksRemaining === 0 && { opacity: 0.3 }]} onPress={() => handleUpdateBlockWeeks(index, 1)}>
                                    <Text style={styles.counterBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            ))}

            <TouchableOpacity style={styles.addBlockBtn} onPress={handleAddBlock}>
                <Text style={styles.addBlockText}>+ Add Block</Text>
            </TouchableOpacity>

        </ScrollView>

        <View style={styles.footer}>
            <TouchableOpacity 
                style={[styles.nextBtn, weeksRemaining !== 0 && { opacity: 0.5 }]} 
                onPress={handleGenerateAndContinue}
            >
                <Text style={styles.nextBtnText}>Next Step: Configure Days →</Text>
            </TouchableOpacity>
        </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090B' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { color: '#FFF', fontSize: 24 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  content: { paddingHorizontal: 20, paddingBottom: 100 },
  
  progressBox: {
      backgroundColor: '#18181B',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: '#27272A',
      marginBottom: 24,
  },
  progressLabel: { color: palette.gray[400], fontSize: 14, marginBottom: 8 },
  progressNumbers: { fontSize: 32, fontWeight: 'bold', marginBottom: 12 },
  progressBar: { height: 6, backgroundColor: '#27272A', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  warningText: { color: '#F87171', fontSize: 12, marginTop: 12 },

  instructions: { color: palette.gray[400], fontSize: 14, marginBottom: 20, lineHeight: 20 },

  blockCard: {
      backgroundColor: '#18181B',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#27272A',
      marginBottom: 16,
  },
  blockCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  blockCardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  deleteIcon: { color: palette.gray[500], fontSize: 18 },
  
  blockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockNameWrap: { flex: 1 },
  label: { color: palette.gray[400], fontSize: 12, marginBottom: 8 },
  blockNameVal: { color: '#FFF', fontSize: 18, fontWeight: '500' },
  
  counterWrap: { alignItems: 'center' },
  counterControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#27272A', borderRadius: 12, padding: 4 },
  counterBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3F3F46', borderRadius: 8 },
  counterBtnText: { color: '#FFF', fontSize: 20 },
  counterVal: { color: '#FFF', fontSize: 16, fontWeight: 'bold', width: 40, textAlign: 'center' },

  addBlockBtn: {
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: '#27272A',
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
    backgroundColor: '#09090B',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  nextBtn: {
    backgroundColor: palette.brand[500],
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
});
