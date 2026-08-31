import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Easing,
} from 'react-native';
import { theme, palette } from '../theme';
import { ChangelogEntry } from '../data/changelog';

const { height } = Dimensions.get('window');

interface Props {
  /** Entries to show, newest first. */
  entries: ChangelogEntry[];
  onDismiss: () => void;
}

/**
 * "What's New" sheet that lists release highlights for one or more versions.
 * Shown app-wide by WhatsNewContext after the user opens a freshly-updated
 * build, or on demand.
 */
export const WhatsNewModal: React.FC<Props> = ({ entries, onDismiss }) => {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslate = useRef(new Animated.Value(40)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  // Drive the entrance from an effect (post-commit) + rAF, never synchronously:
  // on the New Architecture / release builds a native-driver animation started
  // before the Modal's native view mounts is silently dropped.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslate, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => cancelAnimationFrame(raf);
  }, [overlayOpacity, sheetTranslate, sheetOpacity]);

  const latest = entries[0];

  return (
    <Modal transparent visible animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Animated.View
          style={[
            styles.sheet,
            { opacity: sheetOpacity, transform: [{ translateY: sheetTranslate }] },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>WHAT'S NEW</Text>
            <Text style={styles.title}>{latest?.title ?? `Version ${latest?.version}`}</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {entries.map((entry, i) => (
              <View key={entry.version} style={[styles.entry, i > 0 && styles.entrySpaced]}>
                <View style={styles.versionRow}>
                  <View style={styles.versionBadge}>
                    <Text style={styles.versionBadgeText}>v{entry.version}</Text>
                  </View>
                  <Text style={styles.date}>{entry.date}</Text>
                </View>
                {entry.highlights.map((line, j) => (
                  <Text key={j} style={styles.highlight}>
                    {line}
                  </Text>
                ))}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  sheet: {
    width: '100%',
    maxHeight: height * 0.8,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: theme.typography.textXs.fontSize,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.heading2xl.fontSize,
    fontWeight: '800',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },
  entry: {},
  entrySpaced: {
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  versionBadge: {
    backgroundColor: palette.brand[950],
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xxs,
    marginRight: theme.spacing.sm,
  },
  versionBadgeText: {
    color: theme.colors.accent,
    fontSize: theme.typography.textXs.fontSize,
    fontWeight: '700',
  },
  date: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.textSm.fontSize,
  },
  highlight: {
    color: theme.colors.text,
    fontSize: theme.typography.textMd.fontSize,
    lineHeight: theme.typography.textMd.lineHeight,
    marginBottom: theme.spacing.md,
  },
  button: {
    backgroundColor: theme.colors.primary,
    margin: theme.spacing.xl,
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: theme.typography.textMd.fontSize,
    fontWeight: '700',
  },
});
