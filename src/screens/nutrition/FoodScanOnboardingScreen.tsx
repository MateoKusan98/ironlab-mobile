import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

const ChecklistItem: React.FC<{ label: string; value: string; isComplete: boolean }> = ({ 
  label, 
  value, 
  isComplete 
}) => (
  <View style={styles.checkItem}>
    <Text style={styles.checkLabel}>{label}</Text>
    <View style={styles.checkRight}>
      <Text style={styles.checkValue}>{value}</Text>
      <View style={[styles.checkDot, isComplete && styles.checkDotComplete]}>
        {isComplete && <Text style={styles.checkIcon}>✓</Text>}
      </View>
    </View>
  </View>
);

export const FoodScanOnboardingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isReady, setIsReady] = useState(false);

  // Simulate hardware checks
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
            <View style={styles.iconBack}>
                <Text style={styles.brainIcon}>⚙️</Text>
            </View>
        </View>

        <Text style={styles.title}>Scan Meal with AI</Text>
        <Text style={styles.subtitle}>Please ensure the following</Text>

        <View style={styles.checklist}>
            <ChecklistItem label="Camera Quality" value="720p" isComplete={isReady} />
            <ChecklistItem label="Internet Speed" value="10mbps" isComplete={isReady} />
            <ChecklistItem label="Well Lit Room" value="True" isComplete={isReady} />
        </View>

        <View style={styles.footer}>
            <TouchableOpacity
                style={[styles.scanBtn, !isReady && styles.scanBtnDisabled]}
                onPress={() => navigation.navigate('MealScan')}
                disabled={!isReady}
            >
                <Text style={styles.scanBtnText}>Scan Meal with AI</Text>
                <Text style={styles.uploadIcon}>📷</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.barcodeBtn, !isReady && styles.scanBtnDisabled]}
                onPress={() => navigation.navigate('BarcodeScanner')}
                disabled={!isReady}
            >
                <Text style={styles.barcodeBtnText}>🔲  Scan Barcode</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.manualBtn}
                onPress={() => navigation.navigate('ManualFoodLog')}
            >
                <Text style={styles.manualBtnText}>Log food manually</Text>
            </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 24,
    alignItems: 'center',
    paddingTop: 60,
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconBack: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.2)',
  },
  brainIcon: { fontSize: 32 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 60,
  },
  checklist: {
    width: '100%',
    gap: 1,
    backgroundColor: '#18181B',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 80,
  },
  checkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  checkLabel: {
    fontSize: 16,
    color: '#FFF',
  },
  checkRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  checkDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDotComplete: {
    backgroundColor: '#22C55E',
  },
  checkIcon: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    width: '100%',
    gap: 24,
  },
  scanBtn: {
    backgroundColor: palette.brand[500],
    height: 64,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  scanBtnDisabled: {
    opacity: 0.5,
  },
  scanBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  uploadIcon: { fontSize: 18 },
  barcodeBtn: {
    backgroundColor: 'transparent',
    height: 64,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: palette.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.brand[500],
  },
  manualBtn: {
    alignItems: 'center',
  },
  manualBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.brand[500],
  },
});
