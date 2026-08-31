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
import { Camera, CameraView, BarcodeScanningResult } from 'expo-camera';
import { useSafeAreaInsets , SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { palette } from '../../theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FRAME_W = SCREEN_W * 0.82;
const FRAME_H = FRAME_W * 0.45;
// True center of the screen — same value used by both the overlay and the corners
const FRAME_TOP = (SCREEN_H - FRAME_H) / 2;
const FRAME_LEFT = (SCREEN_W - FRAME_W) / 2;
const OVERLAY = 'rgba(0,0,0,0.62)';

export const BarcodeScanScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [looking, setLooking] = useState(false);
  const lastScanned = useRef<string | null>(null);

  React.useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const handleBarcode = async ({ data }: BarcodeScanningResult) => {
    if (looking || lastScanned.current === data) return;
    lastScanned.current = data;
    setLooking(true);

    try {
      const res = await api.get(`/nutrition/barcode/${data}`);
      const result = res.data?.data ?? res.data;

      if (!result.found) {
        Alert.alert(
          'Product not found',
          `Barcode ${data} wasn't found in our database. You can log it manually.`,
          [
            { text: 'Try Again', onPress: () => { lastScanned.current = null; setLooking(false); } },
            { text: 'Log Manually', onPress: () => navigation.replace('ManualFoodLog', {}) },
          ],
        );
        return;
      }

      const d = result.data;
      navigation.replace('ManualFoodLog', {
        prefill: {
          mealName: d.brand ? `${d.name} (${d.brand})` : d.name,
          calories: d.calories,
          protein: d.protein,
          carbs: d.carbs,
          fat: d.fat,
        },
      });
    } catch {
      Alert.alert('Error', 'Could not look up this barcode. Check your connection.', [
        { text: 'Retry', onPress: () => { lastScanned.current = null; setLooking(false); } },
      ]);
    } finally {
      setLooking(false);
    }
  };

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.noCamera}>Camera permission is required to scan barcodes.</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera */}
      {hasPermission && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
          onBarcodeScanned={looking ? undefined : handleBarcode}
        />
      )}

      {/* Overlay: three rows using the exact same FRAME_TOP math as the frame below */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* above frame */}
        <View style={{ height: FRAME_TOP, backgroundColor: OVERLAY }} />
        {/* beside frame */}
        <View style={{ flexDirection: 'row', height: FRAME_H }}>
          <View style={{ width: FRAME_LEFT, backgroundColor: OVERLAY }} />
          <View style={{ width: FRAME_W }} />
          <View style={{ flex: 1, backgroundColor: OVERLAY }} />
        </View>
        {/* below frame */}
        <View style={{ flex: 1, backgroundColor: OVERLAY }} />
      </View>

      {/* Frame corners — absolutely positioned at the same FRAME_TOP / FRAME_LEFT */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: FRAME_TOP,
          left: FRAME_LEFT,
          width: FRAME_W,
          height: FRAME_H,
        }}
      >
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
        {looking && (
          <View style={styles.scanningOverlay}>
            <ActivityIndicator color={palette.brand[500]} size="small" />
            <Text style={styles.scanningText}>Looking up product…</Text>
          </View>
        )}
      </View>

      {/* Hint label — just below the frame */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: FRAME_TOP + FRAME_H + 18, left: 0, right: 0, alignItems: 'center' }}
      >
        <Text style={styles.hint}>
          {looking ? '' : 'Point camera at a product barcode'}
        </Text>
      </View>

      {/* Header */}
      <View style={[styles.header, { top: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🔲 Scan Barcode</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Bottom fallback link */}
      <View style={[styles.bottom, { bottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.replace('ManualFoodLog', {})}
          style={styles.manualLink}
        >
          <Text style={styles.manualLinkText}>Log manually instead</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.black },
  noCamera: { color: palette.white, textAlign: 'center', marginTop: 100, fontSize: 16, paddingHorizontal: 24 },
  backBtn: { alignSelf: 'center', marginTop: 20 },
  backBtnText: { color: palette.brand[500], fontSize: 16 },

  header: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: palette.white, fontSize: 22 },
  headerTitle: { color: palette.white, fontSize: 17, fontWeight: '700' },

  corner: { position: 'absolute', width: 28, height: 28, borderColor: palette.white },
  topLeft:    { top: -2,    left: -2,    borderTopWidth: 3,    borderLeftWidth: 3,    borderTopLeftRadius: 10 },
  topRight:   { top: -2,    right: -2,   borderTopWidth: 3,    borderRightWidth: 3,   borderTopRightRadius: 10 },
  bottomLeft: { bottom: -2, left: -2,    borderBottomWidth: 3, borderLeftWidth: 3,    borderBottomLeftRadius: 10 },
  bottomRight:{ bottom: -2, right: -2,   borderBottomWidth: 3, borderRightWidth: 3,   borderBottomRightRadius: 10 },

  scanningOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
  },
  scanningText: { color: palette.white, fontSize: 14 },

  hint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    overflow: 'hidden',
  },

  bottom: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  manualLink: { paddingVertical: 12 },
  manualLinkText: { color: palette.brand[400], fontSize: 14, fontWeight: '600' },
});
