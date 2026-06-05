import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../screens/coach/DashboardScreen';
import { ClientDetailScreen } from '../screens/coach/ClientDetailScreen';
import { CreateWorkoutScreen } from '../screens/coach/CreateWorkoutScreen';
import { NotesScreen } from '../screens/coach/NotesScreen';
import { FormCheckQueueScreen } from '../screens/coach/FormCheckQueueScreen';
import { ProfileScreen } from '../screens/client/ProfileScreen';
import { theme } from '../theme';
import { Users, UserCircle } from 'phosphor-react-native';

export type CoachStackParamList = {
  Dashboard: undefined;
  ClientDetail: { clientId: string; clientName: string };
  CreateWorkout: { clientId: string; clientName: string };
  Notes: { clientId: string; clientName: string };
  FormCheckQueue: undefined;
};

export type CoachTabParamList = {
  ClientsStack: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<CoachStackParamList>();
const Tab = createBottomTabNavigator<CoachTabParamList>();

const CoachStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="ClientDetail" component={ClientDetailScreen} />
      <Stack.Screen name="CreateWorkout" component={CreateWorkoutScreen} />
      <Stack.Screen name="Notes" component={NotesScreen} />
      <Stack.Screen name="FormCheckQueue" component={FormCheckQueueScreen} />
    </Stack.Navigator>
  );
};

export const CoachTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: theme.fontSize.xs,
          fontWeight: theme.fontWeight.medium,
        },
        tabBarIcon: ({ color, focused }) => {
          if (route.name === 'ClientsStack') return <Users size={24} color={color} weight={focused ? 'fill' : 'bold'} />;
          if (route.name === 'Profile') return <UserCircle size={24} color={color} weight={focused ? 'fill' : 'bold'} />;
          return null;
        },
      })}
    >
      <Tab.Screen
        name="ClientsStack"
        component={CoachStack}
        options={{ tabBarLabel: 'Clients' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
