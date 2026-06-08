import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  PanResponder,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTranslation } from 'react-i18next';
import { palette } from '../../theme';
import { CoachPreferences } from '../../services/ai-coach.service';

const { width } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AICoachSetup'>;
};

const TOTAL_STEPS = 3;

const TIME_OPTIONS = [
  { value: 'morning', labelKey: 'aiCoachSetup.morning', subKey: 'aiCoachSetup.morningSub' },
  { value: 'afternoon', labelKey: 'aiCoachSetup.afternoon', subKey: 'aiCoachSetup.afternoonSub' },
  { value: 'evening', labelKey: 'aiCoachSetup.evening', subKey: 'aiCoachSetup.eveningSub' },
];


const DURATIONS = Array.from({ length: 23 }, (_, i) => (i + 1) * 5);
const ITEM_HEIGHT = 60;

const WheelPicker = ({
  data,
  value,
  onValueChange,
}: {
  data: number[];
  value: number;
  onValueChange: (v: number) => void;
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const initialIndex = data.indexOf(value);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex !== -1 ? initialIndex : 0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    if (index >= 0 && index < data.length) {
      setSelectedIndex(index);
      onValueChange(data[index]);
    }
  };

  return (
    <View style={wheel.container}>
      <View style={wheel.highlight} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
        onLayout={() => {
          scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
        }}
      >
        {data.map((item, idx) => (
          <View key={item} style={wheel.item}>
            <Text style={[wheel.text, idx === selectedIndex && wheel.textSelected]}>
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const ARC_SIZE = width - 48;
const SVG_H = ARC_SIZE * 0.95;
const CX = ARC_SIZE * 0.85;   // right side — arc curves on the left
const CY = SVG_H * 0.98;      // near bottom
const RADIUS = ARC_SIZE * 0.80;
const START_ANGLE = 175;       // level 1: lower-left
const END_ANGLE = 275;         // level 5: upper-right
const INTENSITY_LABELS = ['Easy', 'Light', 'Moderate', 'Hard', 'Max'];

const degToRad = (deg: number) => (deg * Math.PI) / 180;

const angleForLevel = (level: number) => {
  return START_ANGLE + ((level - 1) / 4) * (END_ANGLE - START_ANGLE);
};

const pointOnArc = (angleDeg: number) => ({
  x: CX + RADIUS * Math.cos(degToRad(angleDeg)),
  y: CY + RADIUS * Math.sin(degToRad(angleDeg)),
});

const describeArc = (fromDeg: number, toDeg: number) => {
  const start = pointOnArc(fromDeg);
  const end = pointOnArc(toDeg);
  const span = ((toDeg - fromDeg) + 360) % 360;
  const largeArc = span > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
};

const ArcSlider = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  // Store SVG page origin measured once on layout — avoids async race in PanResponder
  const originRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<View>(null);

  const activeAngle = angleForLevel(value);
  const thumbPt = pointOnArc(activeAngle);

  const resolveLevel = (pageX: number, pageY: number) => {
    const touchX = pageX - originRef.current.x;
    const touchY = pageY - originRef.current.y;
    const dx = touchX - CX;
    const dy = touchY - CY;
    let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;
    const clamped = Math.max(START_ANGLE, Math.min(END_ANGLE, angleDeg));
    const ratio = (clamped - START_ANGLE) / (END_ANGLE - START_ANGLE);
    return Math.max(1, Math.min(5, Math.round(ratio * 4) + 1));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        onChange(resolveLevel(e.nativeEvent.pageX, e.nativeEvent.pageY));
      },
      onPanResponderMove: (e) => {
        onChange(resolveLevel(e.nativeEvent.pageX, e.nativeEvent.pageY));
      },
    }),
  ).current;

  return (
    <View
      ref={containerRef}
      style={{ width: ARC_SIZE, height: SVG_H }}
      collapsable={false}
      onLayout={() => {
        containerRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
          originRef.current = { x: px, y: py };
        });
      }}
    >
      <Svg width={ARC_SIZE} height={SVG_H}>
        <Path d={describeArc(START_ANGLE, END_ANGLE)} stroke="#2A2A2A" strokeWidth={10} fill="none" strokeLinecap="round" />
        <Path d={describeArc(START_ANGLE, activeAngle)} stroke="#EA580C" strokeWidth={10} fill="none" strokeLinecap="round" />
        {[1, 2, 3, 4, 5].map((lvl) => {
          const ang = angleForLevel(lvl);
          const inner = { x: CX + (RADIUS - 14) * Math.cos(degToRad(ang)), y: CY + (RADIUS - 14) * Math.sin(degToRad(ang)) };
          const outer = { x: CX + (RADIUS + 6) * Math.cos(degToRad(ang)), y: CY + (RADIUS + 6) * Math.sin(degToRad(ang)) };
          return (
            <Line key={lvl} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke={lvl <= value ? '#EA580C' : '#444'} strokeWidth={lvl === value ? 3 : 2} strokeLinecap="round" />
          );
        })}
      </Svg>
      {/* Draggable thumb — spans full container to capture all touch */}
      <View
        {...panResponder.panHandlers}
        style={[StyleSheet.absoluteFillObject]}
        pointerEvents="box-only"
      />
      {/* Visual thumb — non-interactive, sits on top */}
      <View style={[arcStyles.thumb, { left: thumbPt.x - 24, top: thumbPt.y - 24 }]} pointerEvents="none">
        {/* 4-arrow drag icon */}
        <View style={arcStyles.dragIcon}>
          <View style={arcStyles.dragRow}>
            <View style={arcStyles.arrowUp} />
          </View>
          <View style={arcStyles.dragMiddleRow}>
            <View style={arcStyles.arrowLeft} />
            <View style={arcStyles.dragCenter} />
            <View style={arcStyles.arrowRight} />
          </View>
          <View style={arcStyles.dragRow}>
            <View style={arcStyles.arrowDown} />
          </View>
        </View>
      </View>
    </View>
  );
};

const A = 5; // arrow size
const arcStyles = StyleSheet.create({
  thumb: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  dragIcon: { alignItems: 'center', gap: 2 },
  dragRow: { alignItems: 'center' },
  dragMiddleRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  dragCenter: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' },
  arrowUp: { width: 0, height: 0, borderLeftWidth: A, borderRightWidth: A, borderBottomWidth: A * 1.4, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#FFF' },
  arrowDown: { width: 0, height: 0, borderLeftWidth: A, borderRightWidth: A, borderTopWidth: A * 1.4, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFF' },
  arrowLeft: { width: 0, height: 0, borderTopWidth: A, borderBottomWidth: A, borderRightWidth: A * 1.4, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: '#FFF' },
  arrowRight: { width: 0, height: 0, borderTopWidth: A, borderBottomWidth: A, borderLeftWidth: A * 1.4, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#FFF' },
});

const wheel = StyleSheet.create({
  container: {
    height: ITEM_HEIGHT * 3,
    overflow: 'hidden',
    justifyContent: 'center',
    width: 200,
    alignSelf: 'center',
  },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    borderColor: palette.brand[500],
    borderWidth: 1.5,
    borderRadius: 14,
    zIndex: 1,
  },
  item: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 28, color: palette.gray[500], fontWeight: '500' },
  textSelected: { fontSize: 32, color: palette.brand[500], fontWeight: '800' },
});

export const AICoachSetupScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<Omit<CoachPreferences, 'priority'>>({
    timeSlot: 'morning',
    duration: 45,
    intensity: 3,
  });
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;

  const goNext = () => {
    const next = step + 1;
    Animated.timing(progressAnim, {
      toValue: (next + 1) / TOTAL_STEPS,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setStep(next);
  };

  const goBack = () => {
    const prev = step - 1;
    Animated.timing(progressAnim, {
      toValue: (prev + 1) / TOTAL_STEPS,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setStep(prev);
  };

  const handleFinish = () => {
    navigation.navigate('AICoachExtendedSetup', { preferences: prefs });
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        {step > 0 ? (
          <TouchableOpacity onPress={goBack}>
            <Text style={styles.backBtn}>‹</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>‹</Text>
          </TouchableOpacity>
        )}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <TouchableOpacity onPress={handleFinish}>
          <Text style={styles.skipBtn}>{t('aiCoachSetup.skip')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logo}>
        <Text style={styles.logoIcon}>✚</Text>
      </View>

      {step === 0 && (
        <View style={styles.stepContainer}>
          <Text style={styles.question}>{t('aiCoachSetup.questionTime')}</Text>
          <View style={styles.optionList}>
            {TIME_OPTIONS.map((opt) => {
              const selected = prefs.timeSlot === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionCard, selected && styles.optionCardSelected]}
                  onPress={() => setPrefs((p) => ({ ...p, timeSlot: opt.value as any }))}
                >
                  <View>
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                      {t(opt.labelKey)}
                    </Text>
                    <Text style={styles.optionSub}>{t(opt.subKey)}</Text>
                  </View>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {step === 1 && (
        <View style={styles.stepContainer}>
          <Text style={styles.question}>{t('aiCoachSetup.questionDuration')}</Text>
          <WheelPicker
            data={DURATIONS}
            value={prefs.duration}
            onValueChange={(v) => setPrefs((p) => ({ ...p, duration: v }))}
          />
          <Text style={styles.durationCaption}>
            {t('aiCoachSetup.durationCaption', { minutes: prefs.duration })}
          </Text>
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepContainer}>
          <Text style={styles.question}>{t('aiCoachSetup.questionIntensity')}</Text>
          <Text style={styles.dragHint}>{t('aiCoachSetup.dragHint')}</Text>
          <View style={{ position: 'relative' }}>
            <ArcSlider
              value={prefs.intensity}
              onChange={(v) => setPrefs((p) => ({ ...p, intensity: v }))}
            />
            <View style={styles.intensityReadout}>
              <Text style={styles.intensityBigNum}>{prefs.intensity}</Text>
              <Text style={styles.intensityBigLabel}>{INTENSITY_LABELS[prefs.intensity - 1]}{t('aiCoachSetup.intensitySuffix')}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={step < TOTAL_STEPS - 1 ? goNext : handleFinish}
        >
          <Text style={styles.continueBtnText}>
            {step < TOTAL_STEPS - 1 ? t('aiCoachSetup.continueBtn') : t('aiCoachSetup.meetBtn')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090B' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  backBtn: { fontSize: 28, color: '#FFF', width: 32 },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: palette.gray[800],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: palette.brand[500], borderRadius: 2 },
  skipBtn: { color: palette.gray[400], fontSize: 14, width: 40, textAlign: 'right' },
  logo: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 },
  logoIcon: { fontSize: 32, color: palette.brand[500] },
  stepContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  question: { fontSize: 28, fontWeight: '800', color: '#FFF', lineHeight: 36, marginBottom: 40 },
  optionList: { gap: 12 },
  optionCard: {
    backgroundColor: palette.gray[900],
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.gray[800],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: palette.brand[600],
    backgroundColor: 'rgba(234, 88, 12, 0.08)',
  },
  optionLabel: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  optionLabelSelected: { color: palette.brand[400] },
  optionSub: { color: palette.gray[500], fontSize: 12 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: palette.gray[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: palette.brand[500], backgroundColor: palette.brand[500] },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  durationCaption: {
    color: palette.gray[400],
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
  dragHint: { color: palette.gray[600], fontSize: 13, marginBottom: 4 },
  intensityReadout: { position: 'absolute', bottom: 60, right: 0, alignItems: 'flex-end' },
  intensityBigNum: { fontSize: 96, fontWeight: '900', color: '#FFF', lineHeight: 100 },
  intensityBigLabel: { color: palette.gray[400], fontSize: 16, fontWeight: '600', textAlign: 'right' },
  footer: { padding: 24, paddingBottom: 36 },
  continueBtn: {
    backgroundColor: palette.brand[500],
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  continueBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },
});
