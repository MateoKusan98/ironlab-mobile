import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/AppNavigator';

/** Open one movement's full history — the same screen from every place a lift is named. */
export function useOpenExerciseHistory(): (name: string) => void {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (name: string) => navigation.navigate('ExerciseHistory', { name });
}
