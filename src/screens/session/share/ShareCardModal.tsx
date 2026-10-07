import React, { useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, useWindowDimensions, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { palette } from '../../../theme';
import type { SessionSet } from '../../../services/session.service';
import { buildShareCard, formatVolume } from './shareCard';
import { captureToFile } from './viewShot';

/** A story is 9:16; anything else gets cropped by Instagram. */
const STORY_RATIO = 16 / 9;
/** Leaves room for the buttons under the preview on a small phone. */
const MAX_PREVIEW_HEIGHT_FRACTION = 0.68;

export interface SharePr {
  exerciseName: string;
  label: string;
  value: number;
}

/**
 * Preview of the session as a story image, and the button that shares it. The athlete
 * sees exactly the picture that leaves the phone — no surprise crops, no numbers they
 * did not check.
 */
export const ShareCardModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  sets: SessionSet[];
  date: string;
  durationMinutes: number;
  prs: SharePr[];
  exName: (name: string) => string;
}> = ({ visible, onClose, sets, date, durationMinutes, prs, exName }) => {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const card = buildShareCard(sets);

  const cardHeight = Math.min((width - 48) * STORY_RATIO, height * MAX_PREVIEW_HEIGHT_FRACTION);
  const cardWidth = cardHeight / STORY_RATIO;

  const share = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureToFile(cardRef.current);
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
    } catch {
      Alert.alert(t('common.error'), t('shareCard.failed', { defaultValue: "Couldn't create the image. Try again." }));
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View ref={cardRef} collapsable={false} style={[styles.card, { width: cardWidth, height: cardHeight }]}>
          <View style={styles.topRow}>
            <Text style={styles.brand}>IRONLAB</Text>
            <Text style={styles.date}>{date}</Text>
          </View>

          <Text style={styles.headline}>
            {prs.length
              ? t('shareCard.prHeadline', { count: prs.length, defaultValue: '🏆 {{count}} new PR' })
              : t('shareCard.headline', { defaultValue: 'Session complete' })}
          </Text>

          <View style={styles.stats}>
            <Stat value={`${durationMinutes}′`} label={t('shareCard.duration', { defaultValue: 'Time' })} />
            <Stat value={String(card.setCount)} label={t('shareCard.sets', { defaultValue: 'Sets' })} />
            <Stat value={formatVolume(card.volumeKg)} label={t('shareCard.volume', { defaultValue: 'Volume' })} />
          </View>

          <View style={styles.lifts}>
            {card.lifts.map((lift) => (
              <View key={lift.name} style={styles.liftRow}>
                <Text style={styles.liftName} numberOfLines={1}>{exName(lift.name)}</Text>
                <Text style={styles.liftTop}>{lift.weight}kg × {lift.reps}</Text>
              </View>
            ))}
          </View>

          {prs.length > 0 && (
            <View style={styles.prs}>
              {prs.slice(0, 3).map((pr) => (
                <Text key={`${pr.exerciseName}-${pr.label}`} style={styles.prText} numberOfLines={1}>
                  ★ {exName(pr.exerciseName)} · {pr.label} {pr.value}kg
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.footer}>{t('shareCard.footer', { defaultValue: 'Trained with IronLab' })}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity accessibilityRole="button" style={styles.closeBtn} onPress={onClose} disabled={sharing}>
            <Text style={styles.closeText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.shareBtn} onPress={share} disabled={sharing}>
            {sharing
              ? <ActivityIndicator color={palette.white} />
              : <Text style={styles.shareText}>{t('shareCard.share', { defaultValue: 'Share image' })}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: palette.gray[900],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.brand[700],
    padding: 22,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: palette.brand[500], fontWeight: '900', letterSpacing: 3, fontSize: 14 },
  date: { color: palette.gray[400], fontSize: 12 },
  headline: { color: palette.white, fontSize: 28, fontWeight: '900', marginTop: 8 },
  stats: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.gray[700], paddingVertical: 12 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: palette.white, fontSize: 22, fontWeight: '800' },
  statLabel: { color: palette.gray[400], fontSize: 11, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  lifts: { gap: 10 },
  liftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  liftName: { color: palette.gray[200], fontSize: 15, flex: 1 },
  liftTop: { color: palette.white, fontSize: 17, fontWeight: '800' },
  prs: { backgroundColor: palette.gray[800], borderRadius: 12, padding: 12, gap: 4 },
  prText: { color: palette.brand[300], fontSize: 13, fontWeight: '700' },
  footer: { color: palette.gray[500], fontSize: 11, textAlign: 'center', letterSpacing: 1 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  closeBtn: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: 12, backgroundColor: palette.gray[800] },
  closeText: { color: palette.gray[200], fontWeight: '700' },
  shareBtn: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, backgroundColor: palette.brand[600], minWidth: 150, alignItems: 'center' },
  shareText: { color: palette.white, fontWeight: '800' },
});
