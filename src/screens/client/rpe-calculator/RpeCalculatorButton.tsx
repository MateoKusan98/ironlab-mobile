import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calculator } from 'phosphor-react-native';
import type { RootStackParamList } from '../../../navigation/AppNavigator';
import { palette } from '../../../theme';

/** Header icon that opens the RPE calculator. */
export const RpeCalculatorButton: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('RpeCalculator')}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={t('rpeCalculator.title', { defaultValue: 'RPE calculator' })}
    >
      <Calculator size={24} color={palette.gray[300]} />
    </TouchableOpacity>
  );
};
