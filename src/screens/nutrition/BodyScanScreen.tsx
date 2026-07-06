import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme, palette } from '../../theme';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';

const { width, height } = Dimensions.get('window');

export const BodyScanScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  // Self-timer: 0 = off, otherwise seconds to count down before capture
  const TIMER_OPTIONS = [0, 3, 5, 10];
  const [timerDuration, setTimerDuration] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const cameraRef = useRef<any>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Clean up any running countdown when leaving the screen
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Shared: upload an image uri to the AI for analysis
  const analyzeImage = async (uri: string) => {
    try {
      setIsAnalyzing(true);
      const returnTo = (route.params as any)?.returnTo;

      const formData = new FormData();
      formData.append('image', {
        uri,
        name: 'scan.jpg',
        type: 'image/jpeg',
      } as any);

      if (returnTo === 'FoodDetails') {
        const response = await api.post('/nutrition/analyze-food', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        navigation.replace('FoodDetails', { food: response.data });
      } else {
        const response = await api.post('/nutrition/analyze-body', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        navigation.replace('ScanResult', { analysis: response.data.data });
      }
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert(t('bodyScan.analysisFailed'), t('bodyScan.analysisFailedMsg'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || !cameraReady) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      await analyzeImage(photo.uri);
    } catch (error) {
      console.error('Capture error:', error);
      Alert.alert(t('bodyScan.analysisFailed'), t('bodyScan.analysisFailedMsg'));
    }
  };

  // Press "Scan Body": fire immediately, or run the self-timer countdown first
  const handleScanPress = () => {
    if (isAnalyzing || countdown !== null) return;
    if (timerDuration === 0) {
      capturePhoto();
      return;
    }
    setCountdown(timerDuration);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
          capturePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cycleTimer = () => {
    const idx = TIMER_OPTIONS.indexOf(timerDuration);
    setTimerDuration(TIMER_OPTIONS[(idx + 1) % TIMER_OPTIONS.length]);
  };

  // Pick an existing photo from the gallery and analyze it
  const pickFromGallery = async () => {
    if (isAnalyzing) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('bodyScan.noGallery'), t('bodyScan.noGalleryMsg'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await analyzeImage(result.assets[0].uri);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><ActivityIndicator color={palette.brand[500]} /></View>;
  }
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#FFF', textAlign: 'center' }}>{t('bodyScan.noCamera')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ color: palette.brand[500] }}>{t('bodyScan.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        onCameraReady={() => setCameraReady(true)}
        ref={cameraRef}
        facing="front"
      >
        <SafeAreaView style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={cycleTimer}
              style={[styles.timerBtn, timerDuration > 0 && styles.timerBtnActive]}
              disabled={countdown !== null || isAnalyzing}
            >
              <Text style={[styles.timerBtnText, timerDuration > 0 && styles.timerBtnTextActive]}>
                {timerDuration === 0 ? `⏱ ${t('bodyScan.timerOff')}` : `⏱ ${timerDuration}s`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>{t('bodyScan.scanTitle')}</Text>
            <View style={styles.clothingHint}>
              <Text style={styles.clothingHintIcon}>👕</Text>
              <Text style={styles.clothingHintText}>{t('bodyScan.clothingHint')}</Text>
            </View>
          </View>

          {/* Scanning Frame Overlay */}
          <View style={styles.frameContainer}>
            <View style={styles.scanFrame}>
                {/* Frame Corners */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                
                {/* Pulse Bar Effect (Simulated) */}
                <View style={styles.pulseBar} />

                {/* Self-timer countdown */}
                {countdown !== null && (
                  <View style={styles.countdownOverlay}>
                    <Text style={styles.countdownText}>{countdown}</Text>
                  </View>
                )}
            </View>
            <Text style={styles.frameHint}>
              {countdown !== null ? t('bodyScan.getReady') : t('bodyScan.holdStill')}
            </Text>
          </View>

          {/* Bottom Action */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={[styles.captureBtn, (isAnalyzing || countdown !== null) && styles.btnDisabled]}
              onPress={handleScanPress}
              disabled={isAnalyzing || countdown !== null}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                   <Text style={styles.captureBtnText}>
                     {countdown !== null ? `${countdown}…` : t('bodyScan.scanBody')}
                   </Text>
                   <Text style={styles.captureIcon}>⚲</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.galleryBtn, (isAnalyzing || countdown !== null) && styles.btnDisabled]}
              onPress={pickFromGallery}
              disabled={isAnalyzing || countdown !== null}
            >
              <Text style={styles.galleryIcon}>🖼️</Text>
              <Text style={styles.galleryBtnText}>{t('bodyScan.uploadPhoto')}</Text>
            </TouchableOpacity>
          </View>

          {/* Vital Mocks (like in screenshot) */}
          <View style={styles.vitalsContainer}>
             <View style={styles.vitalCard}>
                <Text style={styles.vitalIcon}>🩸</Text>
                <Text style={styles.vitalValue}>128</Text>
                <Text style={styles.vitalUnit}>mmHg</Text>
             </View>
             <View style={[styles.vitalCard, { right: 20 }]}>
                <Text style={[styles.vitalIcon, { color: '#3B82F6' }]}>💙</Text>
                <Text style={styles.vitalValue}>72</Text>
                <Text style={styles.vitalUnit}>bpm</Text>
             </View>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 24,
    color: '#FFF',
  },
  aiLogo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: palette.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.brand[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  plusIcon: {
    fontSize: 28,
    color: '#000',
    fontWeight: 'bold',
  },
  titleContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 30,
  },
  clothingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.4)',
  },
  clothingHintIcon: {
    fontSize: 14,
  },
  clothingHintText: {
    fontSize: 13,
    color: palette.brand[300],
    fontWeight: '500',
  },
  frameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: width * 0.7,
    height: height * 0.5,
    borderWidth: 0,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFF',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },
  pulseBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: palette.brand[500],
    shadowColor: palette.brand[500],
    shadowRadius: 10,
    shadowOpacity: 1,
    elevation: 5,
  },
  frameHint: {
    marginTop: 20,
    color: '#AAA',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  timerBtn: {
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(24, 24, 27, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  timerBtnActive: {
    backgroundColor: palette.brand[600],
    borderColor: palette.brand[500],
  },
  timerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  timerBtnTextActive: {
    color: '#000',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#FFF',
    textShadowColor: palette.brand[500],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  bottomContainer: {
    paddingBottom: 20,
    gap: 12,
  },
  galleryBtn: {
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(24, 24, 27, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  galleryIcon: {
    fontSize: 18,
  },
  galleryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  captureBtn: {
    backgroundColor: palette.brand[500],
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  captureBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  captureIcon: {
    fontSize: 20,
    color: '#000',
  },
  vitalsContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    height: 100,
  },
  vitalCard: {
    position: 'absolute',
    left: 20,
    backgroundColor: 'rgba(24, 24, 27, 0.8)',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    width: 70,
    height: 90,
    justifyContent: 'center',
  },
  vitalIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  vitalValue: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: 'bold',
  },
  vitalUnit: {
    fontSize: 10,
    color: '#AAA',
  },
  backBtn: {
    marginTop: 20,
    alignSelf: 'center',
  }
});
