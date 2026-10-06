import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { styles } from '../ActiveWorkoutScreen.styles';

export interface WorkoutHeaderProps {
  elapsedSeconds: number;
  isPaused: boolean;
  completedSets: number;
  totalSets: number;
  onMinimize: () => void;
  onCancel: () => void;
  onResume: () => void;
  onFinish: () => void;
}

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * The workout's fixed header: minimize/cancel, the clock, sets done, finish, the
 * progress bar and the idle auto-pause banner.
 *
 * Split out of ActiveWorkoutScreen (2026-10-06, a move with no behaviour change).
 */
export const WorkoutHeader: React.FC<WorkoutHeaderProps> = ({
  elapsedSeconds, isPaused, completedSets, totalSets, onMinimize, onCancel, onResume, onFinish,
}) => {
  const { t } = useTranslation();
  return (
    <>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onMinimize}
          onLongPress={onCancel}
          delayLongPress={600}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('activeWorkout.minimize', { defaultValue: 'Minimize workout' })}
          accessibilityHint={t('activeWorkout.minimizeHint', { defaultValue: 'Double tap and hold to cancel the workout' })}
        >
          <Text style={styles.cancelBtnText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.timerBlock}
          activeOpacity={isPaused ? 0.6 : 1}
          onPress={isPaused ? onResume : undefined}
        >
          <Text style={[styles.timerLabel, isPaused && styles.timerLabelPaused]}>
            {isPaused ? 'PAUSED' : t('activeWorkout.time')}
          </Text>
          <Text style={[styles.timer, isPaused && styles.timerPaused]}>{formatTime(elapsedSeconds)}</Text>
        </TouchableOpacity>
        <View style={styles.progressBlock}>
          <Text style={styles.progressLabel}>{t('activeWorkout.setsDone')}</Text>
          <Text style={styles.progressValue}>{completedSets}/{totalSets}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" style={styles.finishBtn} onPress={onFinish}>
          <Text style={styles.finishBtnText}>{t('activeWorkout.finish')}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: totalSets > 0 ? `${(completedSets / totalSets) * 100}%` : '0%' }]} />
      </View>
      <Text style={styles.minimizeHint}>{t('activeWorkout.tapToGoBack')}  ·  {t('activeWorkout.holdToCancel')}</Text>

      {/* Idle Auto-Pause Banner */}
      {isPaused && (
        <View style={styles.pausedBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pausedTitle}>⏸ Timer paused</Text>
            <Text style={styles.pausedText}>
              You were idle for a while, so we stopped the clock. The idle time isn't counted.
            </Text>
          </View>
          <TouchableOpacity accessibilityRole="button" style={styles.resumeBtn} onPress={onResume}>
            <Text style={styles.resumeBtnText}>Resume</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};
