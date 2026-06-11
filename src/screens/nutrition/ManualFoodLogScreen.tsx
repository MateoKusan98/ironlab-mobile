import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme, palette } from '../../theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import * as ImagePicker from 'expo-image-picker';
import { useCreateFoodLog, useIngredientSearch } from '../../hooks/useNutrition';
import { nutritionService } from '../../services/nutrition.service';
import { 
  TextInput, 
  Button, 
  Dropdown, 
  Switch,
} from '../../components/ui';

interface SelectedIngredient {
  id: string;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const ManualFoodLogScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ManualFoodLog'>>();
  const prefill = route.params?.prefill;
  const createFoodLog = useCreateFoodLog();

  // State for form fields — initialised from AI prefill when available
  const [mealName, setMealName] = useState(prefill?.mealName ?? '');
  const [category, setCategory] = useState(prefill?.category ?? 'BREAKFAST');
  const [description, setDescription] = useState('');

  // Macros
  const [calories, setCalories] = useState(String(prefill?.calories ?? 0));
  const [protein, setProtein] = useState(String(prefill?.protein ?? 0));
  const [carb, setCarb] = useState(String(prefill?.carbs ?? 0));
  const [fat, setFat] = useState(String(prefill?.fat ?? 0));

  const [submitToDb, setSubmitToDb] = useState(true);
  const [saveAsRecipe, setSaveAsRecipe] = useState(false);

  // Custom Ingredients
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [ingredients, setIngredients] = useState<SelectedIngredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);
  const [ingredientGrams, setIngredientGrams] = useState('100');

  // Image states — use scanned image if available
  const [mealImage, setMealImage] = useState<string | null>(prefill?.imageUri ?? null);

  // Paste ingredients modal
  const [pasteModalVisible, setPasteModalVisible] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedIngredients, setParsedIngredients] = useState<Array<{
    name: string; quantity: number; unit: string;
    calories: number; protein: number; carbs: number; fat: number;
  }>>([]);

  const categories = [
    { label: 'Breakfast', value: 'BREAKFAST' },
    { label: 'Lunch', value: 'LUNCH' },
    { label: 'Dinner', value: 'DINNER' },
    { label: 'Snack', value: 'SNACK' },
  ];

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 800);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: searchResults, isFetching: isSearching } = useIngredientSearch(debouncedQuery);

  const handleAddIngredient = () => {
    if (!selectedIngredient) return;
    const g = parseFloat(ingredientGrams);
    if (isNaN(g) || g <= 0) {
      Alert.alert(t('common.error'), t('manualFood.invalidGrams'));
      return;
    }

    // Multiply the per100g values by (g/100)
    const multiplier = g / 100;
    const newIngredient: SelectedIngredient = {
      id: selectedIngredient.fdcId + '-' + Date.now(), // unique id
      name: selectedIngredient.description,
      grams: g,
      calories: Math.round(selectedIngredient.calories * multiplier),
      protein: Math.round(selectedIngredient.protein * multiplier),
      carbs: Math.round(selectedIngredient.carbs * multiplier),
      fat: Math.round(selectedIngredient.fat * multiplier),
    };

    const newIngredientsList = [...ingredients, newIngredient];
    setIngredients(newIngredientsList);
    
    // Auto-sum and update inputs
    let totalCal = 0, totalP = 0, totalC = 0, totalF = 0;
    newIngredientsList.forEach(ing => {
      totalCal += ing.calories;
      totalP += ing.protein;
      totalC += ing.carbs;
      totalF += ing.fat;
    });

    setCalories(totalCal.toString());
    setProtein(totalP.toString());
    setCarb(totalC.toString());
    setFat(totalF.toString());

    // Reset selection
    setSelectedIngredient(null);
    setSearchQuery('');
    setIngredientGrams('100');
  };

  const handleRemoveIngredient = (id: string) => {
    const newIngredientsList = ingredients.filter(i => i.id !== id);
    setIngredients(newIngredientsList);

    // Auto-sum and update inputs
    let totalCal = 0, totalP = 0, totalC = 0, totalF = 0;
    newIngredientsList.forEach(ing => {
      totalCal += ing.calories;
      totalP += ing.protein;
      totalC += ing.carbs;
      totalF += ing.fat;
    });

    setCalories(totalCal.toString());
    setProtein(totalP.toString());
    setCarb(totalC.toString());
    setFat(totalF.toString());
  };

  const handleParseIngredients = async () => {
    if (!pasteText.trim()) return;
    setParsing(true);
    try {
      const result = await nutritionService.parseIngredients(pasteText.trim());
      setParsedIngredients(result.ingredients ?? []);
      if (!mealName && result.mealName) setMealName(result.mealName);
      if (result.totalCalories != null) setCalories(String(Math.round(result.totalCalories)));
      if (result.totalProtein  != null) setProtein(String(result.totalProtein));
      if (result.totalCarbs    != null) setCarb(String(result.totalCarbs));
      if (result.totalFat      != null) setFat(String(result.totalFat));
      setPasteModalVisible(false);
      setPasteText('');
    } catch {
      Alert.alert(t('common.error'), t('manualFood.parseError'));
    } finally {
      setParsing(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('manualFood.permissionDenied'), t('manualFood.cameraPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setMealImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!mealName) {
      Alert.alert(t('common.error'), t('manualFood.missingMealName'));
      return;
    }

    const formData = new FormData();
    formData.append('mealName', mealName);
    formData.append('calories', calories);
    formData.append('protein', protein);
    formData.append('carbs', carb);
    formData.append('fat', fat);
    formData.append('mealType', category);
    formData.append('notes', description);
    formData.append('date', new Date().toISOString().split('T')[0]);
    formData.append('saveAsRecipe', String(saveAsRecipe));

    if (mealImage) {
      const uriParts = mealImage.split('.');
      const fileType = uriParts[uriParts.length - 1];
      formData.append('image', {
        uri: Platform.OS === 'ios' ? mealImage.replace('file://', '') : mealImage,
        name: `meal_${Date.now()}.${fileType}`,
        type: `image/${fileType}`,
      } as any);
    }

    try {
      await createFoodLog.mutateAsync(formData);
      Alert.alert(t('common.success'), t('manualFood.mealLoggedSuccess'));
      navigation.navigate('ClientApp' as any);
    } catch (error) {
      Alert.alert(t('common.error'), t('manualFood.logError'));
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <View style={styles.backBtn} />
          <Text style={styles.headerTitle}>{t('manualFood.headerTitle')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* AI prefill banner */}
          {prefill?.mealName && (
            <View style={styles.aiBanner}>
              <Text style={styles.aiBannerText}>🤖 AI detected: <Text style={styles.aiBannerMeal}>{prefill.mealName}</Text> — review and adjust if needed</Text>
            </View>
          )}
          {/* Dish Icon Section */}
          <View style={styles.dishSection}>
            <TouchableOpacity onPress={pickImage} style={styles.dishCircle}>
              {mealImage ? (
                <Image source={{ uri: mealImage }} style={styles.pickedImage} />
              ) : (
                <Text style={styles.dishIcon}>🍴</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage} style={styles.uploadBtn}>
                <Text style={styles.uploadBtnIcon}>📤</Text>
            </TouchableOpacity>
          </View>

          {/* General Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🔘</Text>
                <Text style={styles.sectionLabel}>{t('manualFood.general')}</Text>
            </View>
            
            <TextInput
              label="Meal Name"
              value={mealName}
              onChangeText={setMealName}
              placeholder="e.g. Steak and Fries"
              leftIcon={<Text>🗒️</Text>}
            />

            <Dropdown
              label="Meal Category"
              items={categories}
              value={category}
              onSelect={setCategory}
            />

            <TextInput
              label="Meal Description (Optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Enter your main text here..."
              multiline
              numberOfLines={4}
              style={{ minHeight: 120 }}
            />
          </View>

          {/* Ingredients Section (USDA powered) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🛒</Text>
              <Text style={styles.sectionLabel}>{t('manualFood.ingredients')}</Text>
              <TouchableOpacity
                style={styles.pasteBtn}
                onPress={() => setPasteModalVisible(true)}
              >
                <Text style={styles.pasteBtnText}>{t('manualFood.pasteRecipe')}</Text>
              </TouchableOpacity>
            </View>

            {/* Parsed ingredients from recipe paste */}
            {(parsedIngredients?.length ?? 0) > 0 && (
              <View style={styles.selectedIngredientsList}>
                {parsedIngredients.map((ing, idx) => (
                  <View key={idx} style={styles.selectedIngredientItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ingName}>{ing.name}</Text>
                      <Text style={styles.ingDetails}>
                        {ing.quantity}{ing.unit} • {ing.calories} kcal • P: {ing.protein}g C: {ing.carbs}g F: {ing.fat}g
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            {/* Selected Ingredients List */}
            {ingredients.length > 0 && (
              <View style={styles.selectedIngredientsList}>
                {ingredients.map(ing => (
                  <View key={ing.id} style={styles.selectedIngredientItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ingName}>{ing.name}</Text>
                      <Text style={styles.ingDetails}>{ing.grams}g • {ing.calories} kcal • P: {ing.protein}g C: {ing.carbs}g F: {ing.fat}g</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveIngredient(ing.id)} style={styles.removeIngBtn}>
                      <Text style={styles.removeIngIcon}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Selection Prompt */}
            {selectedIngredient ? (
              <View style={styles.addIngredientPrompt}>
                 <Text style={styles.promptLabel}>Amount of <Text style={{ color: palette.brand[500] }}>{selectedIngredient.description}</Text></Text>
                 <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <TextInput
                            label="Grams"
                            value={ingredientGrams}
                            onChangeText={setIngredientGrams}
                            keyboardType="numeric"
                        />
                    </View>
                    <Button label="Add" onPress={handleAddIngredient} style={{ marginTop: 28 }} />
                 </View>
                 <TouchableOpacity onPress={() => setSelectedIngredient(null)} style={{ marginTop: 10 }}>
                    <Text style={{ color: palette.gray[500], textAlign: 'center' }}>{t('common.cancel')}</Text>
                 </TouchableOpacity>
              </View>
            ) : (
                <>
                    <TextInput
                        label="Search Ingredients"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="e.g. Chicken breast"
                        leftIcon={<Text>🔍</Text>}
                    />
                    
                    {/* Search Results */}
                    {isSearching ? (
                        <ActivityIndicator color={palette.brand[500]} style={{ marginTop: 10 }} />
                    ) : searchResults && searchQuery.length >= 2 && (
                        <View style={styles.searchResultsContainer}>
                            {searchResults.length === 0 ? (
                                <Text style={styles.noResultsText}>{t('manualFood.noResults')}</Text>
                            ) : undefined}
                            {searchResults.slice(0, 5).map((res: any) => (
                                <TouchableOpacity 
                                    key={res.fdcId} 
                                    style={styles.searchResultItem}
                                    onPress={() => setSelectedIngredient(res)}
                                >
                                    <Text style={styles.resultName} numberOfLines={1}>{res.description}</Text>
                                    <Text style={styles.resultDetails}>Per 100g: {res.calories} kcal</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </>
            )}
          </View>

          {/* Nutritional Value Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>🍲</Text>
                <Text style={styles.sectionLabel}>{t('manualFood.nutritionalTotals')}</Text>
            </View>
            <Text style={styles.macrosHint}>{t('manualFood.macrosHint')}</Text>

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                    <TextInput
                    label="Calories (kcal)"
                    value={calories}
                    onChangeText={setCalories}
                    keyboardType="numeric"
                    leftIcon={<Text>🔥</Text>}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <TextInput
                    label="Protein (g)"
                    value={protein}
                    onChangeText={setProtein}
                    keyboardType="numeric"
                    leftIcon={<Text>🥩</Text>}
                    />
                </View>
            </View>

            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: theme.spacing.md }}>
                  <TextInput
                    label="Carb (g)"
                    value={carb}
                    onChangeText={setCarb}
                    keyboardType="numeric"
                    leftIcon={<Text>🥯</Text>}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    label="Fat (g)"
                    value={fat}
                    onChangeText={setFat}
                    keyboardType="numeric"
                    leftIcon={<Text>🥑</Text>}
                  />
                </View>
            </View>
          </View>

          {/* Toggle Section */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>{t('manualFood.submitToDb')}</Text>
                <Text style={styles.toggleSub}>{t('manualFood.submitToDbSub')}</Text>
            </View>
            <Switch checked={submitToDb} onValueChange={setSubmitToDb} />
          </View>

          {/* Log Meal Button */}
          <Button
            label={t('manualFood.logMeal')}
            size="lg"
            variant="solid"
            isFullWidth
            style={styles.logBtn}
            isLoading={createFoodLog.isPending}
            onPress={handleSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Paste ingredients modal */}
      <Modal visible={pasteModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPasteModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={pm.header}>
            <Text style={pm.title}>{t('manualFood.pasteRecipeTitle')}</Text>
            <TouchableOpacity onPress={() => setPasteModalVisible(false)} style={pm.closeBtn}>
              <Text style={pm.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={pm.hint}>{t('manualFood.pasteHint')}</Text>
          <Text style={pm.example}>
            e.g.{'\n'}3 eggs{'\n'}60g whey protein{'\n'}80g oat flour{'\n'}100g Greek yogurt 0%
          </Text>

          <RNTextInput
            style={pm.input}
            multiline
            placeholder={t('manualFood.pastePlaceholder')}
            placeholderTextColor="#555"
            value={pasteText}
            onChangeText={setPasteText}
            textAlignVertical="top"
          />

          <View style={pm.footer}>
            <TouchableOpacity
              style={[pm.analyzeBtn, (!pasteText.trim() || parsing) && pm.analyzeBtnDisabled]}
              onPress={handleParseIngredients}
              disabled={!pasteText.trim() || parsing}
            >
              {parsing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={pm.analyzeBtnText}>{t('manualFood.analyzeBtn')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: '#FFF',
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  aiBanner: {
    backgroundColor: palette.brand[900] + '60',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: palette.brand[600] + '80',
  },
  aiBannerText: { color: palette.gray[300], fontSize: 13, lineHeight: 18 },
  aiBannerMeal: { color: palette.brand[400], fontWeight: '700' },
  dishSection: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  dishCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
  },
  dishIcon: {
    fontSize: 48,
  },
  uploadBtn: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: palette.brand[500],
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  uploadBtnIcon: {
    fontSize: 14,
    color: '#000',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: '#111113',
    padding: 20,
    borderRadius: 20,
  },
  toggleTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  toggleSub: {
    color: palette.gray[500],
    fontSize: 12,
  },
  logBtn: {
    height: 64,
    borderRadius: 20,
    backgroundColor: palette.brand[500],
  },
  macrosHint: {
      color: palette.gray[400],
      fontSize: 12,
      marginBottom: 16,
  },
  searchResultsContainer: {
      backgroundColor: '#18181B',
      borderRadius: 12,
      padding: 10,
      marginTop: 8,
      borderWidth: 1,
      borderColor: '#27272A',
  },
  searchResultItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#27272A',
  },
  resultName: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 14,
  },
  resultDetails: {
      color: palette.gray[500],
      fontSize: 12,
      marginTop: 2,
  },
  noResultsText: {
      color: palette.gray[500],
      textAlign: 'center',
      paddingVertical: 10,
  },
  addIngredientPrompt: {
      backgroundColor: '#18181B',
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.brand[500],
  },
  promptLabel: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 15,
  },
  selectedIngredientsList: {
      marginBottom: 16,
      gap: 10,
  },
  selectedIngredientItem: {
      backgroundColor: '#111113',
      borderWidth: 1,
      borderColor: '#27272A',
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
  },
  ingName: {
      color: '#FFF',
      fontWeight: 'bold',
      fontSize: 14,
  },
  ingDetails: {
      color: palette.brand[500],
      fontSize: 12,
      marginTop: 4,
      fontWeight: '600',
  },
  removeIngBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#27272A',
      alignItems: 'center',
      justifyContent: 'center',
  },
  removeIngIcon: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pasteBtn: {
    marginLeft: 'auto' as any,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: palette.brand[500],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pasteBtnText: {
    color: palette.brand[400],
    fontSize: 12,
    fontWeight: '600',
  },
});

const pm = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1e',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    color: palette.gray[400],
    fontSize: 14,
    paddingHorizontal: 24,
    paddingTop: 20,
    lineHeight: 20,
  },
  example: {
    color: '#555',
    fontSize: 13,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  input: {
    flex: 1,
    marginHorizontal: 24,
    backgroundColor: '#111113',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 16,
    padding: 16,
    color: '#FFF',
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    padding: 24,
  },
  analyzeBtn: {
    backgroundColor: palette.brand[500],
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeBtnDisabled: {
    opacity: 0.4,
  },
  analyzeBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
