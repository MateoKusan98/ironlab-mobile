import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { palette } from '../../theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';

import { appendFile } from '../../utils/upload';
const { width } = Dimensions.get('window');
const FRAME_SIZE = width * 0.78;

export const MealScanScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  React.useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current || !cameraReady || analyzing) return;
    setAnalyzing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      const formData = new FormData();
      appendFile(formData, 'image', { uri: photo.uri, name: 'meal.jpg', type: 'image/jpeg' });

      const response = await api.post('/nutrition/analyze-food', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = response.data?.data ?? response.data;

      navigation.replace('ManualFoodLog', {
        prefill: {
          mealName: result.name ?? '',
          calories: Math.round(result.calories ?? 0),
          protein: Math.round(result.macros?.protein ?? 0),
          carbs: Math.round(result.macros?.carbs ?? 0),
          fat: Math.round(result.macros?.fat ?? 0),
          category: (result.category ?? 'LUNCH').toUpperCase(),
          imageUri: photo.uri,
          ingredients: Array.isArray(result.ingredients) ? result.ingredients : [],
        },
      });
    } catch {
      Alert.alert(t('bodyScan.analysisFailed'), t('bodyScan.analysisFailedMsg'));
    } finally {
      setAnalyzing(false);
    }
  };

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.noCamera}>{t('bodyScan.noCamera')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {hasPermission && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
          ref={cameraRef}
        />
      )}

      <SafeAreaView style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📸 AI Meal Scan</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Frame */}
        <View style={styles.frameWrapper}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.frameHint}>
            {analyzing ? t('common.loading') : 'Center your meal in the frame'}
          </Text>
        </View>

        {/* Capture button */}
        <View style={styles.bottom}>
          <TouchableOpacity
            style={[styles.captureBtn, analyzing && styles.captureBtnDisabled]}
            onPress={takePicture}
            disabled={analyzing || !cameraReady}
          >
            {analyzing ? (
              <View style={styles.analyzingRow}>
                <ActivityIndicator color={palette.black} />
                <Text style={styles.captureBtnText}>Analysing...</Text>
              </View>
            ) : (
              <Text style={styles.captureBtnText}>📷  Scan Meal</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.replace('ManualFoodLog', {})} style={styles.manualLink}>
            <Text style={styles.manualLinkText}>{t('manualFood.logManually') ?? 'Log manually instead'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.black },
  overlay: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 24 },
  noCamera: { color: palette.white, textAlign: 'center', marginTop: 100, fontSize: 16 },
  backBtn: { alignSelf: 'center', marginTop: 20 },
  backBtnText: { color: palette.brand[500], fontSize: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: palette.white, fontSize: 22 },
  headerTitle: { color: palette.white, fontSize: 17, fontWeight: '700' },

  frameWrapper: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    backgroundColor: 'rgba(255,255,255,0.04)',
    position: 'relative',
  },
  corner: { position: 'absolute', width: 36, height: 36, borderColor: palette.white },
  topLeft:    { top: -2,    left: -2,    borderTopWidth: 3,    borderLeftWidth: 3,    borderTopLeftRadius: 14 },
  topRight:   { top: -2,    right: -2,   borderTopWidth: 3,    borderRightWidth: 3,   borderTopRightRadius: 14 },
  bottomLeft: { bottom: -2, left: -2,    borderBottomWidth: 3, borderLeftWidth: 3,    borderBottomLeftRadius: 14 },
  bottomRight:{ bottom: -2, right: -2,   borderBottomWidth: 3, borderRightWidth: 3,   borderBottomRightRadius: 14 },

  frameHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },

  bottom: { gap: 14 },
  captureBtn: {
    backgroundColor: palette.brand[500],
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnDisabled: { opacity: 0.6 },
  captureBtnText: { fontSize: 17, fontWeight: '800', color: palette.black },
  analyzingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  manualLink: { alignItems: 'center' },
  manualLinkText: { color: palette.brand[400], fontSize: 14, fontWeight: '600' },
});
