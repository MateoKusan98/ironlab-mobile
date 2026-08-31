import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TextInput as RNTextInput,
  Image,
  Animated,
  Easing
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { KeyboardAwareScreen } from '../../components/ui/KeyboardAwareScreen';
import { theme, palette } from '../../theme';
import { useAuthStore } from '../../stores/auth.store';
import { usersService } from '../../services/users.service';
import type { RootStackParamList } from '../../navigation/AppNavigator';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Helper: Generate numbers for pickers
const generateRange = (start: number, end: number) => {
  const result = [];
  for (let i = start; i <= end; i++) result.push(i);
  return result;
};

// --- Functional Component: WheelPicker (Local) ---
interface WheelPickerProps {
  data: (string | number)[];
  onValueChange: (value: string | number) => void;
  defaultValue?: string | number;
  itemHeight?: number;
  hideHighlight?: boolean;
}

const WheelPicker: React.FC<WheelPickerProps> = ({ data, onValueChange, defaultValue, itemHeight = 60, hideHighlight = false }) => {
  const scrollRef = useRef<ScrollView>(null);
  const initialIndex = data.indexOf(defaultValue || data[0]);
  const [selectedIndex, setSelectedIndex] = useState(initialIndex !== -1 ? initialIndex : 0);
  const nudgeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * itemHeight, animated: false });
    }, 100);
  }, []);

  const triggerNudge = () => {
    nudgeAnim.setValue(0);
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(nudgeAnim, { toValue: -6, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(nudgeAnim, { toValue: 0, friction: 4, tension: 180, useNativeDriver: true }),
      ]).start();
    }, 500);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / itemHeight);
    if (index >= 0 && index < data.length) {
      setSelectedIndex(index);
      onValueChange(data[index]);
      triggerNudge();
    }
  };

  return (
    <View style={{ height: itemHeight * 3, overflow: 'hidden', justifyContent: 'center' }}>
      {!hideHighlight && (
        <View style={[styles.wheelHighlightBoxed, { height: itemHeight, position: 'absolute', top: itemHeight, left: 0, right: 0 }]} />
      )}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={{ paddingVertical: itemHeight }}
      >
        {data.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <View key={index} style={{ height: itemHeight, justifyContent: 'center', alignItems: 'center' }}>
              {isSelected ? (
                <Animated.Text
                  style={[styles.wheelTextMediumBoxed, styles.wheelTextSelectedBoxed, { transform: [{ translateY: nudgeAnim }] }]}
                >
                  {item}
                </Animated.Text>
              ) : (
                <Text style={styles.wheelTextMediumBoxed}>{item}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

// --- Functional Component: RulerPicker (Local for Weight) ---
const RulerPicker: React.FC<{ value: number; onValueChange: (v: number) => void; min: number; max: number }> = ({ value, onValueChange, min, max }) => {
  const TICK_SPACING = 15;
  const data = generateRange(min, max);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const index = value - min;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ x: index * TICK_SPACING, animated: false });
    }, 100);
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / TICK_SPACING);
    const newValue = min + index;
    if (newValue >= min && newValue <= max && newValue !== value) {
      onValueChange(newValue);
    }
  };

  return (
    <View style={styles.horizontalSliderMock}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={TICK_SPACING}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: SCREEN_WIDTH / 2 - TICK_SPACING / 2 }}
      >
        {data.map((v) => (
          <View key={v} style={{ width: TICK_SPACING, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={[styles.sliderTickLine, v % 10 === 0 ? styles.sliderTickCenter : null]} />
            {v % 10 === 0 && <Text style={styles.sliderTickText}>{v}</Text>}
          </View>
        ))}
      </ScrollView>
      <View style={styles.rulerCenterPointer} />
    </View>
  );
};

export const SetupWizardScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setUser } = useAuthStore();
  const [step, setStep] = useState<number>(0);
  
  // State for forms
  const [dob, setDob] = useState({ month: 'Sep', day: 8, year: 2001 });
  const [gender, setGender] = useState<string>('Other');
  const [otherGenderText, setOtherGenderText] = useState('');
  const [weight, setWeight] = useState(140);
  const [height, setHeight] = useState(162);
  const [fitnessLevel, setFitnessLevel] = useState(4);
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'inch'>('cm');
  
  // Avatar state
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadProgress] = useState(new Animated.Value(0));

  // The ring is an indeterminate spinner, so it loops for as long as the upload
  // runs — a single pass leaves it frozen on screen for any slower upload.
  // It starts here rather than in doRealUpload because the Animated.View it
  // drives does not exist until isUploading puts it in the tree, and a
  // native-driver animation started before its node mounts silently no-ops.
  useEffect(() => {
    if (!isUploading) return;
    uploadProgress.setValue(0);
    const spin = Animated.loop(
      Animated.timing(uploadProgress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spin.start();
    return () => spin.stop();
  }, [isUploading, uploadProgress]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('setup.permissionDenied'), t('setup.galleryPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setAvatar(uri);
      doRealUpload(uri);
    }
  };

  const doRealUpload = async (uri: string) => {
    setIsUploading(true);
    setUploadPercent(0);

    try {
      const updatedUser = await usersService.uploadAvatar(uri, setUploadPercent);
      await setUser(updatedUser);
    } catch (err) {
      console.warn('Avatar upload failed, continuing without avatar:', err);
    } finally {
      setIsUploading(false);
      nextStep();
    }
  };

  const completeSetup = async () => {
    try {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthIndex = months.indexOf(dob.month) + 1;
      const dobStr = `${dob.year}-${String(monthIndex).padStart(2, '0')}-${String(dob.day).padStart(2, '0')}`;
      const genderStr = gender === 'Other' ? (otherGenderText || 'Other') : gender;

      const updatedUser = await usersService.updateProfile({
        dob: dobStr,
        gender: genderStr,
        weight,
        weightUnit: unit,
        height,
        heightUnit,
        fitnessLevel,
        isSetupComplete: true,
      });

      // Persist updated user in the auth store so AppNavigator reroutes to ClientApp
      await setUser(updatedUser);
      navigation.replace('ClientApp');
    } catch (err) {
      Alert.alert(t('common.error'), t('setup.saveError'));
      console.error('completeSetup error:', err);
    }
  };

  const nextStep = () => {
    if (step < 6) setStep(step + 1);
    else completeSetup();
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const renderTopNav = (progress: number) => (
    <View style={[styles.stepTopNav, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity
        onPress={prevStep}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={t('a11y.previous', { defaultValue: 'Previous' })}
      >
        <Text style={styles.navText}>‹</Text>
      </TouchableOpacity>
      <View style={styles.progressBarWrapper}>
        <ProgressBar progress={progress} color={palette.brand[500]} height={6} />
      </View>
      <TouchableOpacity accessibilityRole="button" onPress={nextStep}>
        <Text style={styles.navTextSkip}>{t('common.skip')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderIntro = () => (
    <View style={[styles.introContainer, { paddingTop: insets.top + 20 }]}>
      <View style={styles.stepsHeader}>
        <View style={styles.stepItem}>
          <View style={[styles.dot, styles.dotActive]}><View style={styles.innerDot} /></View>
          <Text style={[styles.stepText, styles.stepTextActive]}>{t('setup.assessment')}</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.stepItem}><View style={styles.dot} /><Text style={styles.stepText}>{t('setup.personalInfo')}</Text></View>
        <View style={styles.stepLine} />
        <View style={styles.stepItem}><View style={styles.dot} /><Text style={styles.stepText}>{t('setup.choosePlan')}</Text></View>
      </View>
      <View style={styles.introCenter}>
        <View style={styles.logoBase}>
          <View style={styles.logoBaseV} />
          <View style={styles.logoBaseH} />
        </View>

        <Text style={styles.title}>{t('setup.setupTitle')}</Text>
        <Text style={styles.subtitle}>{t('setup.setupSubtitle')}</Text>
      </View>

      <View style={styles.introFooter}>
        <Button
          label={t('setup.readyBtn')}
          onPress={nextStep}
          variant="solid"
          color="brand"
          size="lg"
          style={{ width: '100%', marginBottom: theme.spacing.xl }}
        />
        <Button
          label={t('setup.logoutDemo')}
          onPress={() => useAuthStore.getState().logout()}
          variant="ghost"
          color="brand"
        />
      </View>
    </View>
  );
  
  const renderAvatarStep = () => {
    if (isUploading) {
      return (
        <View style={styles.container}>
          {renderTopNav(12)}
          <View style={styles.stepContent}>
            <View style={styles.uploadProgressContainer}>
              <View style={styles.progressRingBase}>
                 {/* Progress Ring logic simplified using Views for performance */}
                 <View style={styles.avatarCircleBorder}>
                    <Image source={{ uri: avatar! }} style={styles.avatarImageLarge} />
                 </View>
                 <Animated.View 
                   style={[
                     styles.progressOverlay, 
                     {
                       transform: [
                         { rotate: uploadProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }
                       ]
                     }
                   ]} 
                 />
              </View>
              
              <Text style={styles.titleBig}>{t('setup.uploadingImage')}</Text>
              {/* Empty until the first progress event: some transports report no
                  Content-Length, and a stuck "0%" reads worse than no number. */}
              <Text style={styles.fileName}>{uploadPercent > 0 ? `${uploadPercent}%` : ''}</Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {renderTopNav(12)}
        <View style={styles.stepContent}>
          <Text style={styles.titleBig}>{t('setup.setupAvatar')}</Text>
          
          <View style={styles.avatarPlaceholderContainer}>
            <View style={styles.avatarPlaceholder}>
               <Text style={{ fontSize: 40, color: palette.brand[500] }}>👤</Text>
            </View>
          </View>

          <View style={{ gap: 16 }}>
            <Button
              label={t('setup.uploadImage')}
              onPress={handlePickImage}
              variant="solid"
              color="brand"
              size="lg"
            />
            <Button
              label={t('setup.choosePremadeAvatar')}
              onPress={nextStep}
              variant="outline"
              color="brand"
              size="lg"
              style={{ borderColor: palette.brand[500] }}
            />
          </View>

          <TouchableOpacity accessibilityRole="button" style={styles.skipWrapper} onPress={nextStep}>
            <Text style={styles.skipIcon}>✕</Text>
            <Text style={styles.skipLinkText}>{t('setup.skipStep')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDOBStep = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days = generateRange(1, 31);
    const years = generateRange(1950, 2010);
    const itemHeight = 70; // Larger items for better visibility

    return (
      <View style={[styles.container, { paddingHorizontal: 0 }]}>
        {renderTopNav(25)}
        <View style={styles.stepContent}>
          <Text style={styles.titleBig}>{t('setup.whenBorn')}</Text>
          
          <View style={{ marginVertical: 40, position: 'relative', width: '100%' }}>
            {/* Unified Row Highlight */}
            <View 
              style={[
                styles.wheelHighlightBoxed, 
                { 
                  height: itemHeight, 
                  position: 'absolute', 
                  top: itemHeight, 
                  left: 20, 
                  right: 20,
                  pointerEvents: 'none' // Ensure it doesn't block touches
                }
              ]} 
            />
            
            <View style={{ flexDirection: 'row', paddingHorizontal: 20 }}>
              <View style={{ flex: 1.2 }}>
                <WheelPicker 
                  data={months} 
                  defaultValue={dob.month} 
                  onValueChange={(v) => setDob({...dob, month: v as string })} 
                  itemHeight={itemHeight}
                  hideHighlight 
                />
              </View>
              <View style={{ flex: 1 }}>
                <WheelPicker 
                  data={days} 
                  defaultValue={dob.day} 
                  onValueChange={(v) => setDob({...dob, day: v as number })} 
                  itemHeight={itemHeight}
                  hideHighlight 
                />
              </View>
              <View style={{ flex: 1 }}>
                <WheelPicker 
                  data={years} 
                  defaultValue={dob.year} 
                  onValueChange={(v) => setDob({...dob, year: v as number })} 
                  itemHeight={itemHeight}
                  hideHighlight 
                />
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 20 }}>
            <Text style={{ fontSize: 18, color: palette.gray[400] }}>🎂 </Text>
            <Text style={{ color: palette.gray[400], fontSize: 16, fontWeight: '500' }}>
              {t('setup.yearsOfAge', { age: 2024 - dob.year })}
            </Text>
          </View>
          
          <View style={{ paddingHorizontal: 20 }}>
            <Button label={t('setup.continueBtn')} onPress={nextStep} variant="solid" color="brand" />
          </View>
        </View>
      </View>
    );
  };

  const renderGenderStep = () => (
    <KeyboardAwareScreen style={styles.container}>
      {renderTopNav(40)}
      <View style={styles.stepContent}>
        <Text style={styles.titleBig}>{t('setup.whatsGender')}</Text>
        <Text style={[styles.subtitle, { marginBottom: 32 }]}>{t('setup.genderRegulatory')}</Text>

        {['Male', 'Female', 'Other'].map((g) => (
          <TouchableOpacity accessibilityRole="button" key={g} style={[styles.radioOption, gender === g && styles.radioOptionSelected]} onPress={() => setGender(g)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.radioIcon}>{g === 'Male' ? '♂️' : g === 'Female' ? '♀️' : '⚥'}</Text>
                <Text style={styles.radioLabel}>I am {g}</Text>
              </View>
              <View style={[styles.radioCircle, gender === g && styles.radioCircleActive]}>
                {gender === g && <View style={styles.radioInnerCircle} />}
              </View>
            </View>
            {g === 'Other' && gender === 'Other' && (
              <View style={{ marginTop: 16 }}>
                <RNTextInput 
                  style={styles.genderInput} 
                  placeholder="Axionis - cosmic energy..." 
                  placeholderTextColor={palette.gray[500]}
                  value={otherGenderText}
                  onChangeText={setOtherGenderText}
                  maxLength={30}
                  multiline
                />
                <Text style={styles.charCount}>{otherGenderText.length}/30</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
        <Button label={t('setup.continueBtn')} onPress={nextStep} variant="solid" color="brand" style={{ marginTop: 24, marginBottom: 16 }} />
        <Button label={t('setup.preferNotToSay')} onPress={nextStep} variant="outline" color="brand" />
      </View>
    </KeyboardAwareScreen>
  );

  const renderWeightStep = () => (
    <View style={styles.container}>
      {renderTopNav(58)}
      <View style={styles.stepContent}>
        <Text style={styles.titleBig}>{t('setup.whatsWeight')}</Text>
        <View style={styles.unitToggle}>
          <TouchableOpacity accessibilityRole="button" style={[styles.unitBtn, unit === 'lbs' && styles.unitBtnActive]} onPress={() => setUnit('lbs')}><Text style={[styles.unitText, unit === 'lbs' && styles.unitTextActive]}>lbs</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={[styles.unitBtn, unit === 'kg' && styles.unitBtnActive]} onPress={() => setUnit('kg')}><Text style={[styles.unitText, unit === 'kg' && styles.unitTextActive]}>kg</Text></TouchableOpacity>
        </View>
        <View style={styles.valueDisplay}>
          <Text style={styles.valueLarge}>{weight}</Text>
          <Text style={styles.valueUnit}>{unit}</Text>
        </View>
        <RulerPicker min={60} max={350} value={weight} onValueChange={setWeight} />
        <Button label={t('setup.continueBtn')} onPress={nextStep} variant="solid" color="brand" style={{ marginTop: 40 }} />
      </View>
    </View>
  );

  const renderHeightStep = () => (
    <View style={styles.container}>
      {renderTopNav(75)}
      <View style={styles.stepContent}>
        <Text style={styles.titleBig}>{t('setup.whatsHeight')}</Text>
        <View style={styles.unitToggle}>
          <TouchableOpacity accessibilityRole="button" style={[styles.unitBtn, heightUnit === 'cm' && styles.unitBtnActive]} onPress={() => setHeightUnit('cm')}><Text style={[styles.unitText, heightUnit === 'cm' && styles.unitTextActive]}>cm</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={[styles.unitBtn, heightUnit === 'inch' && styles.unitBtnActive]} onPress={() => setHeightUnit('inch')}><Text style={[styles.unitText, heightUnit === 'inch' && styles.unitTextActive]}>inch</Text></TouchableOpacity>
        </View>
        <View style={{ marginVertical: 20 }}>
          <WheelPicker data={generateRange(100, 250)} defaultValue={height} onValueChange={(v) => setHeight(v as number)} itemHeight={80} />
        </View>
        <Button label={t('setup.continueBtn')} onPress={nextStep} variant="solid" color="brand" />
      </View>
    </View>
  );

  const renderFitnessLevelStep = () => {
    const levels = [t('setup.levelBeginner'), t('setup.levelActive'), t('setup.levelFit'), t('setup.levelAthletic'), t('setup.levelElite')];
    const descs = [t('setup.descBeginner'), t('setup.descActive'), t('setup.descFit'), t('setup.descAthletic'), t('setup.descElite')];
    return (
      <View style={styles.container}>
        {renderTopNav(90)}
        <View style={styles.stepContentFlex}>
          <ScrollView
            style={styles.stepScroll}
            contentContainerStyle={styles.stepScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.titleBig}>{t('setup.fitnessLevel')}</Text>
            <Text style={styles.levelIndicator}>LEVEL {fitnessLevel + 1}</Text>
            <View style={styles.sliderWrapper}>
               <View style={styles.sliderBarBackground}>
                 {[0,1,2,3,4].map((i) => (
                   <TouchableOpacity key={i} accessibilityRole="adjustable" accessibilityLabel={t('setup.fitnessLevel', { defaultValue: 'Fitness level' })} accessibilityState={{ selected: fitnessLevel === i }} accessibilityValue={{ min: 0, max: 4, now: i }} style={[styles.sliderSegment, { backgroundColor: fitnessLevel >= i ? (i === 0 ? palette.error[500] : i === 1 ? palette.brand[500] : i === 2 ? palette.warning[400] : palette.lime[500]) : palette.gray[800] }]} onPress={() => setFitnessLevel(i)}>
                      {fitnessLevel === i && <View style={styles.sliderThumbLocal}><Text style={{ color: palette.white, fontWeight: 'bold' }}>||</Text></View>}
                   </TouchableOpacity>
                 ))}
               </View>
            </View>
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={styles.fitnessTitle}>{levels[fitnessLevel]}</Text>
              <Text style={styles.fitnessDesc}>{descs[fitnessLevel]}</Text>
              <Text style={styles.dragHint}>{t('setup.dragToAdjust')}</Text>
            </View>
          </ScrollView>
          <View style={[styles.stepFooter, { paddingBottom: insets.bottom + 16 }]}>
            <Button label={t('setup.continueBtn')} onPress={nextStep} variant="solid" color="brand" />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {step === 0 && renderIntro()}
      {step === 1 && renderAvatarStep()}
      {step === 2 && renderDOBStep()}
      {step === 3 && renderGenderStep()}
      {step === 4 && renderWeightStep()}
      {step === 5 && renderHeightStep()}
      {step === 6 && renderFitnessLevelStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.gray[950] },
  introContainer: { flex: 1, paddingHorizontal: theme.spacing.lg },
  stepsHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', marginBottom: 40 },
  stepItem: { alignItems: 'center', flex: 1 },
  stepLine: { width: 40, height: 2, backgroundColor: palette.gray[800], marginTop: 12 },
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: palette.gray[800], justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  dotActive: { borderColor: palette.brand[600], borderWidth: 2, backgroundColor: 'transparent' },
  innerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.brand[600] },
  stepText: { color: palette.gray[500], fontSize: 10, fontWeight: 'bold' },
  stepTextActive: { color: palette.gray[50] },
  introCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.lg },
  logoBase: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  logoBaseV: { position: 'absolute', width: 16, height: 48, backgroundColor: palette.brand[600], borderRadius: 8 },
  logoBaseH: { position: 'absolute', width: 48, height: 16, backgroundColor: palette.brand[600], borderRadius: 8 },
  title: { color: palette.white, fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 16, lineHeight: 34 },
  subtitle: { color: palette.gray[300], textAlign: 'center', fontSize: 16, lineHeight: 24 },
  introFooter: { paddingBottom: 40, alignItems: 'center', paddingHorizontal: 20 },
  stepTopNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  navText: { color: palette.white, fontSize: 32 },
  navTextSkip: { color: palette.white, fontWeight: 'bold' },
  progressBarWrapper: { flex: 1, paddingHorizontal: 20 },
  stepContent: { flexGrow: 1, paddingHorizontal: 20, justifyContent: 'center' },
  stepContentFlex: { flex: 1, paddingHorizontal: 20 },
  stepScroll: { flex: 1 },
  stepScrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 20 },
  stepFooter: { paddingTop: 12 },
  titleBig: { color: palette.white, fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 24 },
  
  // Picker & Ruler
  wheelHighlightBoxed: { 
    backgroundColor: 'rgba(234, 88, 12, 0.25)', // More vibrant orange fill
    borderColor: palette.brand[500], 
    borderWidth: 1.5, 
    borderRadius: 16 
  },
  wheelTextMediumBoxed: { 
    color: palette.gray[500], 
    fontSize: 24, 
    fontWeight: '500' 
  },
  wheelTextSelectedBoxed: { 
    color: palette.brand[500], 
    fontSize: 26, 
    fontWeight: '700' 
  },
  
  horizontalSliderMock: { height: 100, marginTop: 40, position: 'relative' },
  sliderTickLine: { width: 1, height: 24, backgroundColor: palette.gray[700], marginHorizontal: 7 },
  sliderTickCenter: { height: 48, backgroundColor: palette.brand[600], width: 3, borderRadius: 2 },
  rulerCenterPointer: { position: 'absolute', width: 3, height: 48, backgroundColor: palette.brand[500], left: SCREEN_WIDTH / 2 - 1.5, bottom: 0, borderRadius: 2 },
  sliderTickText: { color: palette.gray[500], fontSize: 10, position: 'absolute', bottom: -15, width: 30, textAlign: 'center', left: -15 },

  // Gender
  radioOption: { backgroundColor: palette.gray[900], padding: 20, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: palette.gray[800] },
  radioOptionSelected: { borderColor: palette.brand[600], backgroundColor: 'rgba(234, 88, 12, 0.05)' },
  radioLabel: { color: palette.white, fontSize: 16, fontWeight: 'bold' },
  radioIcon: { fontSize: 20, marginRight: 12 },
  radioCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: palette.gray[950], borderWidth: 1, borderColor: palette.gray[700], alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { backgroundColor: palette.brand[600], borderColor: palette.brand[600] },
  radioInnerCircle: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.white },
  genderInput: { color: palette.white, fontSize: 14, backgroundColor: palette.gray[950], padding: 12, borderRadius: 8, textAlignVertical: 'top', height: 80 },
  charCount: { color: palette.gray[500], fontSize: 10, textAlign: 'right', marginTop: 4 },

  // Unit Toggle
  unitToggle: { flexDirection: 'row', backgroundColor: palette.gray[900], borderRadius: 12, padding: 4, marginHorizontal: 20, marginBottom: 40 },
  unitBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  unitBtnActive: { backgroundColor: palette.gray[800] },
  unitText: { color: palette.gray[500], fontWeight: 'bold' },
  unitTextActive: { color: palette.white },
  valueDisplay: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  valueLarge: { color: palette.white, fontSize: 90, fontWeight: '900' },
  valueUnit: { color: palette.gray[500], fontSize: 24, marginLeft: 8 },

  // Fitness Level
  levelIndicator: { color: palette.brand[500], textAlign: 'center', fontWeight: 'bold', marginBottom: 24 },
  sliderWrapper: { height: 48, width: '100%' },
  sliderBarBackground: { flexDirection: 'row', height: 40, borderRadius: 20, overflow: 'hidden', backgroundColor: palette.gray[900] },
  sliderSegment: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sliderThumbLocal: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.lime[600], shadowColor: palette.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5, alignItems: 'center', justifyContent: 'center' },
  fitnessTitle: { color: palette.white, fontSize: 32, fontWeight: 'bold', marginBottom: 12 },
  fitnessDesc: { color: palette.gray[400], fontSize: 16 },
  dragHint: { color: palette.gray[500], fontSize: 12, marginTop: 24 },
  
  // Avatar Styles
  avatarPlaceholderContainer: { alignItems: 'center', marginVertical: 48 },
  avatarPlaceholder: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(234, 88, 12, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(234, 88, 12, 0.2)' },
  uploadProgressContainer: { alignItems: 'center' },
  progressRingBase: { width: 180, height: 180, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  avatarCircleBorder: { width: 160, height: 160, borderRadius: 80, overflow: 'hidden', borderWidth: 4, borderColor: palette.gray[800], zIndex: 1 },
  avatarImageLarge: { width: '100%', height: '100%' },
  progressOverlay: { position: 'absolute', width: 185, height: 185, borderRadius: 92.5, borderWidth: 4, borderColor: palette.brand[500], borderBottomColor: 'transparent', borderLeftColor: 'transparent' },
  fileName: { color: palette.gray[500], fontSize: 16, marginTop: 8 },
  skipWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  skipIcon: { color: palette.brand[500], fontSize: 18, marginRight: 8, fontWeight: 'bold' },
  skipLinkText: { color: palette.brand[500], fontSize: 16, fontWeight: '600' }
});
