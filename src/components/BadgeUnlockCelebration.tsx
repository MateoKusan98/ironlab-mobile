import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Easing,
} from 'react-native';
import { theme, palette } from '../theme';
import { BADGE_CATALOG, BadgeKey } from '../services/badges.service';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

const STAR_COUNT = 12;
const STAR_COLORS = [...theme.celebration.confetti, palette.purple[400], palette.info[400], palette.emerald[400]];
const STAR_DISTANCES = [90, 120, 105, 135, 95, 115, 100, 130, 110, 90, 125, 105];

interface Props {
  newBadgeKeys: BadgeKey[];
  onDismiss: () => void;
}

export const BadgeUnlockCelebration: React.FC<Props> = ({ newBadgeKeys, onDismiss }) => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  // ── Animation values ───────────────────────────────────────────────────────
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale     = useRef(new Animated.Value(0.3)).current;
  const cardOpacity   = useRef(new Animated.Value(0)).current;
  const shimmer       = useRef(new Animated.Value(-CARD_WIDTH)).current;
  const glow          = useRef(new Animated.Value(0)).current;
  const titleSlide    = useRef(new Animated.Value(20)).current;
  const titleOpacity  = useRef(new Animated.Value(0)).current;
  const ptsScale      = useRef(new Animated.Value(0)).current;

  const stars = useRef(
    Array.from({ length: STAR_COUNT }, () => ({
      x:       new Animated.Value(0),
      y:       new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale:   new Animated.Value(0),
    }))
  ).current;

  const runAnimations = useCallback(() => {
    // Reset
    cardScale.setValue(0.3);
    cardOpacity.setValue(0);
    shimmer.setValue(-CARD_WIDTH);
    glow.setValue(0);
    titleSlide.setValue(20);
    titleOpacity.setValue(0);
    ptsScale.setValue(0);
    stars.forEach((s) => { s.x.setValue(0); s.y.setValue(0); s.opacity.setValue(0); s.scale.setValue(0); });

    // Overlay fade
    Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();

    // Card bounce in
    Animated.parallel([
      Animated.spring(cardScale,   { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Title slide up (slight delay)
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(titleSlide,   { toValue: 0, friction: 8, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]),
    ]).start();

    // Points pop
    Animated.sequence([
      Animated.delay(400),
      Animated.spring(ptsScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
    ]).start();

    // Shimmer sweep — loops
    const runShimmer = () => {
      shimmer.setValue(-CARD_WIDTH);
      Animated.timing(shimmer, {
        toValue: CARD_WIDTH * 1.5,
        duration: 900,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setTimeout(runShimmer, 1400);
      });
    };
    setTimeout(runShimmer, 300);

    // Glow ring pulse — loops
    const runGlow = () => {
      glow.setValue(0);
      Animated.timing(glow, { toValue: 1, duration: 1000, useNativeDriver: true }).start(({ finished }) => {
        if (finished) runGlow();
      });
    };
    runGlow();

    // Stars burst
    const starAnims = stars.map((star, i) => {
      const angle = (i * 360 / STAR_COUNT) * (Math.PI / 180);
      const dist  = STAR_DISTANCES[i];
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      return Animated.sequence([
        Animated.delay(i * 25),
        Animated.parallel([
          Animated.spring(star.x,     { toValue: tx, friction: 6, useNativeDriver: true }),
          Animated.spring(star.y,     { toValue: ty, friction: 6, useNativeDriver: true }),
          Animated.spring(star.scale, { toValue: 1,  friction: 6, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(star.opacity, { toValue: 1, duration: 80,  useNativeDriver: true }),
            Animated.delay(400),
            Animated.timing(star.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
        ]),
      ]);
    });
    Animated.parallel(starAnims).start();
  }, []);

  useEffect(() => {
    runAnimations();
  }, [index]);

  if (!newBadgeKeys.length) return null;

  const badgeKey = newBadgeKeys[index];
  const badge    = BADGE_CATALOG.find((b) => b.key === badgeKey);
  if (!badge) return null;

  const handleNext = () => {
    if (index < newBadgeKeys.length - 1) {
      setIndex((i) => i + 1);
    } else {
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(onDismiss);
    }
  };

  const glowScale   = glow.interpolate({ inputRange: [0, 1], outputRange: [1,   2.0] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.6, 0.2, 0] });

  return (
    <Modal transparent visible statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>

        {/* Stars */}
        <View style={styles.starsAnchor} pointerEvents="none">
          {stars.map((star, i) => (
            <Animated.View
              key={i}
              style={[
                styles.star,
                {
                  backgroundColor: STAR_COLORS[i % STAR_COLORS.length],
                  transform: [{ translateX: star.x }, { translateY: star.y }, { scale: star.scale }],
                  opacity: star.opacity,
                },
              ]}
            />
          ))}
        </View>

        {/* Card */}
        <Animated.View
          style={[styles.card, { transform: [{ scale: cardScale }], opacity: cardOpacity }]}
        >
          {/* Shimmer sweep */}
          <Animated.View
            style={[styles.shimmer, { transform: [{ translateX: shimmer }, { rotate: '20deg' }] }]}
            pointerEvents="none"
          />

          {/* Glow ring behind icon */}
          <View style={styles.iconWrap}>
            <Animated.View
              style={[
                styles.glowRing,
                { transform: [{ scale: glowScale }], opacity: glowOpacity },
              ]}
            />
            <Text style={styles.badgeIcon}>{badge.icon}</Text>
          </View>

          {/* Text */}
          <Animated.View style={{ transform: [{ translateY: titleSlide }], opacity: titleOpacity }}>
            <Text style={styles.unlockedLabel}>{t('badges.badgeUnlocked')}</Text>
            <Text style={styles.badgeName}>{badge.name}</Text>
            <Text style={styles.badgeDesc}>{badge.description}</Text>
          </Animated.View>

          {/* Points */}
          {badge.points > 0 && (
            <Animated.View style={[styles.ptsBadge, { transform: [{ scale: ptsScale }] }]}>
              <Text style={styles.ptsText}>+{badge.points} pts</Text>
            </Animated.View>
          )}

          {/* Counter if multiple */}
          {newBadgeKeys.length > 1 && (
            <Text style={styles.counter}>{index + 1} / {newBadgeKeys.length}</Text>
          )}

          {/* CTA */}
          <TouchableOpacity accessibilityRole="button" style={styles.btn} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.btnText}>
              {index < newBadgeKeys.length - 1 ? t('badges.nextBadge') : t('badges.letsGo')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starsAnchor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 0,
    height: 0,
  },
  star: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // Not a <Card>: this surface is an Animated.View driving scale/opacity on the
  // unlock burst, and it carries a bespoke glow shadow. Kept local deliberately.
  card: {
    width: CARD_WIDTH,
    backgroundColor: theme.surfaceTint.neutral,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: palette.brand[600],
    padding: 28,
    alignItems: 'center',
    overflow: 'hidden',
    // Glow shadow
    shadowColor: palette.brand[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: '200%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: 100,
    height: 100,
  },
  glowRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: palette.brand[400],
  },
  badgeIcon: {
    fontSize: 56,
  },
  unlockedLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    color: palette.brand[400],
    textAlign: 'center',
    marginBottom: 10,
  },
  badgeName: {
    fontSize: 26,
    fontWeight: '900',
    color: palette.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeDesc: {
    fontSize: 14,
    color: palette.gray[400],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  ptsBadge: {
    backgroundColor: palette.brand[900],
    borderWidth: 1,
    borderColor: palette.brand[600],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  ptsText: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.brand[400],
  },
  counter: {
    fontSize: 12,
    color: palette.gray[600],
    marginBottom: 12,
  },
  btn: {
    backgroundColor: palette.brand[600],
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.white,
    letterSpacing: 0.5,
  },
});
