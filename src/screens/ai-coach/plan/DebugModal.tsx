import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, palette } from '../../../theme';
import { aiCoachService } from '../../../services/ai-coach.service';

/**
 * The admin prompt-debug sheet: the exact system prompt and layers sent to the model.
 *
 * Split out of AICoachPlanScreen (2026-10-06, a move with no behaviour change).
 */

type DebugLayer = { key: string; label: string; content: string | null };

const LAYER_LABELS: Record<string, string> = {
  athleteCtx:    'Athlete Profile',
  memoryCtx:     'Coaching Memory',
  behavioralCtx: 'Behavioral Analytics',
  phaseCtx:      'Programming Phase',
  fatigueCtx:    'Fatigue Signal',
  big3Ctx:       'Big 3 Distribution',
  calendarCtx:   'Training Calendar',
  progressCtx:   'Progression Analysis',
  volumeCtx:     'Weekly Volume',
  exIntelCtx:    'Exercise Intelligence',
};

export const DebugModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const [layers, setLayers] = useState<DebugLayer[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>('big3Ctx');

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    aiCoachService.getDebugPrompt()
      .then(({ layers: l, systemPrompt: sp }) => {
        setSystemPrompt(sp);
        setLayers(
          Object.entries(l).map(([key, content]) => ({
            key,
            label: LAYER_LABELS[key] ?? key,
            content: content as string | null,
          }))
        );
      })
      .catch(() => Alert.alert('Error', 'Could not load debug prompt'))
      .finally(() => setLoading(false));
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={dbg.container}>
        <View style={dbg.header}>
          <Text style={dbg.title}>Prompt Debug</Text>
          <TouchableOpacity
            onPress={onClose}
            style={dbg.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={dbg.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={palette.brand[500]} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={dbg.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* System prompt */}
            <TouchableOpacity
              accessibilityRole="button"
              style={[dbg.layerHeader, openKey === '__system__' && dbg.layerHeaderOpen]}
              onPress={() => setOpenKey(openKey === '__system__' ? null : '__system__')}
            >
              <Text style={dbg.layerLabel}>System Prompt</Text>
              <Text style={dbg.layerChevron}>{openKey === '__system__' ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {openKey === '__system__' && (
              <View style={dbg.layerBody}>
                <Text style={dbg.layerText}>{systemPrompt}</Text>
              </View>
            )}

            {/* Context layers */}
            {layers.map(({ key, label, content }) => (
              <View key={key}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[dbg.layerHeader, openKey === key && dbg.layerHeaderOpen]}
                  onPress={() => setOpenKey(openKey === key ? null : key)}
                >
                  <Text style={dbg.layerLabel}>{label}</Text>
                  <Text style={[dbg.layerChevron, !content && dbg.layerChevronEmpty]}>
                    {!content ? 'empty' : openKey === key ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                {openKey === key && content && (
                  <View style={dbg.layerBody}>
                    <Text style={dbg.layerText}>{content}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const dbg = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  title: { fontSize: 16, fontWeight: '700', color: palette.white },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, color: palette.gray[400] },
  scroll: { flex: 1 },
  layerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  layerHeaderOpen: { backgroundColor: palette.gray[900] },
  layerLabel: { fontSize: 13, fontWeight: '700', color: palette.white },
  layerChevron: { fontSize: 11, color: palette.gray[400], fontWeight: '600' },
  layerChevronEmpty: { color: palette.gray[700] },
  layerBody: {
    backgroundColor: palette.gray[950] ?? palette.gray[900],
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: palette.gray[800],
  },
  layerText: { fontSize: 11, color: palette.gray[300], fontFamily: 'Courier', lineHeight: 17 },
});
