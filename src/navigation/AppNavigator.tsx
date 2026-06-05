import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth.store';
import { UserRole } from '@shared';
import { AuthStack } from './AuthStack';
import { SetupWizardScreen } from '../screens/setup/SetupWizardScreen';
import { ClientTabs } from './ClientTabs';
import { CoachTabs } from './CoachTabs';
import { theme } from '../theme';

export type RootStackParamList = {
  Auth: undefined;
  Badges: undefined;
  Setup: undefined;
  ClientApp: undefined;
  CoachApp: undefined;
  CreatePost: undefined;
  PostDetail: { postId: string };
  UserProfile: { userId: string; userName: string };
  Messages: undefined;
  Conversation: { conversationId: string; otherUserId: string; otherUserName: string };
  BodyScan: { returnTo?: string };
  ScanResult: { analysis: any };
  FoodScanOnboarding: undefined;
  FoodDetails: { food?: any };
  ManualFoodLog: { prefill?: { mealName?: string; calories?: number; protein?: number; carbs?: number; fat?: number; category?: string; imageUri?: string } } | undefined;
  MealScan: undefined;
  BarcodeScanner: undefined;
  MyMeals: undefined;
  BrowseMeals: undefined;
  ProgramCreatorStart: undefined;
  ProgramCreatorStructure: undefined;
  ProgramCreatorWeeks: undefined;
  ProgramCreatorDay: { blockIndex: number, weekIndex: number, dayIndex: number };
  AICoachWelcome: undefined;
  AICoachSetup: undefined;
  AICoachExtendedSetup: { preferences?: import('../services/ai-coach.service').CoachPreferences; editMode?: boolean };
  AICoachChat: { preferences?: import('../services/ai-coach.service').CoachPreferences };
  AICoachPlan: undefined;
  WorkoutHistory: undefined;
  Stats: undefined;
  SessionDetail: { sessionId: string };
  StartSession: { plan?: string; nextSessionJson?: import('../services/ai-coach.service').NextSession | null };
  ActiveWorkout: { sessionId: string; plannedExercises?: Array<{ name: string; sets: number; reps: number; weight: number; rpe?: number; cue?: string }> };
  SessionSummary: { sessionId: string; durationMinutes: number; prs?: Array<{ type: string; label: string; value: number; previous: number | null; exerciseName: string }> };
  CardioLog: undefined;
  SupportChat: undefined;
  FormCheck: undefined;
  AdminUsers: undefined;
  AdminAILab: { userId?: string; userName?: string };
  AdminIdeas: undefined;
  SubmitIdea: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.card,
    text: theme.colors.text,
    border: theme.colors.border,
    notification: theme.colors.accent,
  },
};
import { BodyScanScreen } from '../screens/nutrition/BodyScanScreen';
import { ScanResultScreen } from '../screens/nutrition/ScanResultScreen';
import { FoodScanOnboardingScreen } from '../screens/nutrition/FoodScanOnboardingScreen';
import { FoodDetailsScreen } from '../screens/nutrition/FoodDetailsScreen';
import { ManualFoodLogScreen } from '../screens/nutrition/ManualFoodLogScreen';
import { MealScanScreen } from '../screens/nutrition/MealScanScreen';
import { BarcodeScanScreen } from '../screens/nutrition/BarcodeScanScreen';
import { MyMealsScreen } from '../screens/nutrition/MyMealsScreen';
import { BrowseMealsScreen } from '../screens/nutrition/BrowseMealsScreen';

// AI Coach Screens
import { AICoachWelcomeScreen } from '../screens/ai-coach/AICoachWelcomeScreen';
import { AICoachSetupScreen } from '../screens/ai-coach/AICoachSetupScreen';
import { AICoachExtendedSetupScreen } from '../screens/ai-coach/AICoachExtendedSetupScreen';
import { AICoachChatScreen } from '../screens/ai-coach/AICoachChatScreen';
import { AICoachPlanScreen } from '../screens/ai-coach/AICoachPlanScreen';

// Session Logger Screens
import { StartSessionScreen } from '../screens/session/StartSessionScreen';
import { ActiveWorkoutScreen } from '../screens/session/ActiveWorkoutScreen';
import { SessionSummaryScreen } from '../screens/session/SessionSummaryScreen';
import { CardioLogScreen } from '../screens/session/CardioLogScreen';
import { WorkoutHistoryScreen } from '../screens/client/WorkoutHistoryScreen';
import { StatsScreen } from '../screens/client/StatsScreen';
import { SessionDetailScreen } from '../screens/client/SessionDetailScreen';

// Program Creator Screens
import { ProgramCreatorStartScreen } from '../screens/client/program-builder/ProgramCreatorStartScreen';
import { ProgramCreatorStructureScreen } from '../screens/client/program-builder/ProgramCreatorStructureScreen';
import { ProgramCreatorWeeksScreen } from '../screens/client/program-builder/ProgramCreatorWeeksScreen';
import { ProgramCreatorDayScreen } from '../screens/client/program-builder/ProgramCreatorDayScreen';
import { SupportChatScreen } from '../screens/support/SupportChatScreen';
import { FormCheckScreen } from '../screens/form-check/FormCheckScreen';
import { AdminUsersScreen } from '../screens/admin/AdminUsersScreen';
import { AdminAILabScreen } from '../screens/admin/AdminAILabScreen';
import { AdminIdeasScreen } from '../screens/admin/AdminIdeasScreen';
import { SubmitIdeaScreen } from '../screens/client/SubmitIdeaScreen';
import { BadgesScreen } from '../screens/client/BadgesScreen';
import { CreatePostScreen } from '../screens/community/CreatePostScreen';
import { PostDetailScreen } from '../screens/community/PostDetailScreen';
import { UserProfileScreen } from '../screens/community/UserProfileScreen';
import { MessagesScreen } from '../screens/messaging/MessagesScreen';
import { ConversationScreen } from '../screens/messaging/ConversationScreen';

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : user?.role === UserRole.ROLE_COACH ? (
          <Stack.Screen name="CoachApp" component={CoachTabs} />
        ) : (
          <>
            <Stack.Group>
              {user?.isSetupComplete ? (
                <Stack.Screen name="ClientApp" component={ClientTabs} />
              ) : (
                <Stack.Screen name="Setup" component={SetupWizardScreen} />
              )}
            </Stack.Group>
            
            <Stack.Group screenOptions={{ presentation: 'fullScreenModal' }}>
              <Stack.Screen name="BodyScan" component={BodyScanScreen} />
              <Stack.Screen name="ScanResult" component={ScanResultScreen} />
              <Stack.Screen name="FoodScanOnboarding" component={FoodScanOnboardingScreen} />
              <Stack.Screen name="FoodDetails" component={FoodDetailsScreen} />
              <Stack.Screen name="ManualFoodLog" component={ManualFoodLogScreen} />
              <Stack.Screen name="MealScan" component={MealScanScreen} />
              <Stack.Screen name="BarcodeScanner" component={BarcodeScanScreen} />
              <Stack.Screen name="MyMeals" component={MyMealsScreen} />
              <Stack.Screen name="BrowseMeals" component={BrowseMealsScreen} />
            </Stack.Group>

            <Stack.Group screenOptions={{ presentation: 'fullScreenModal' }}>
              <Stack.Screen name="AICoachWelcome" component={AICoachWelcomeScreen} />
              <Stack.Screen name="AICoachSetup" component={AICoachSetupScreen} />
              <Stack.Screen name="AICoachExtendedSetup" component={AICoachExtendedSetupScreen} />
              <Stack.Screen name="AICoachChat" component={AICoachChatScreen} />
              <Stack.Screen name="AICoachPlan" component={AICoachPlanScreen} />
            </Stack.Group>

            <Stack.Group screenOptions={{ presentation: 'fullScreenModal' }}>
              <Stack.Screen name="StartSession" component={StartSessionScreen} />
              <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
              <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
              <Stack.Screen name="CardioLog" component={CardioLogScreen} />
            </Stack.Group>

            <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
            <Stack.Screen name="Stats" component={StatsScreen} />
            <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />

            <Stack.Group screenOptions={{ presentation: 'fullScreenModal' }}>
              <Stack.Screen name="ProgramCreatorStart" component={ProgramCreatorStartScreen} />
              <Stack.Screen name="ProgramCreatorStructure" component={ProgramCreatorStructureScreen} />
              <Stack.Screen name="ProgramCreatorWeeks" component={ProgramCreatorWeeksScreen} />
              <Stack.Screen name="ProgramCreatorDay" component={ProgramCreatorDayScreen} />
            </Stack.Group>

            <Stack.Screen name="SupportChat" component={SupportChatScreen} />
            <Stack.Screen name="FormCheck" component={FormCheckScreen} />
            <Stack.Screen name="Badges" component={BadgesScreen} />
            <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
            <Stack.Screen name="AdminAILab" component={AdminAILabScreen} />
            <Stack.Screen name="AdminIdeas" component={AdminIdeasScreen} />
            <Stack.Screen name="SubmitIdea" component={SubmitIdeaScreen} />
            <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="Messages" component={MessagesScreen} />
            <Stack.Screen name="Conversation" component={ConversationScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
