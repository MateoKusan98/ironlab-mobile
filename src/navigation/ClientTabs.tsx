import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/client/HomeScreen';
import { WorkoutScreen } from '../screens/client/WorkoutScreen';
import { NutritionDashboardScreen } from '../screens/client/NutritionDashboardScreen';
import { CommunityFeedScreen } from '../screens/community/CommunityFeedScreen';
import { ProfileScreen } from '../screens/client/ProfileScreen';
import { theme } from '../theme';
import { useTranslation } from 'react-i18next';
import { House, Barbell, ForkKnife, Users, UserCircle } from 'phosphor-react-native';

export type ClientTabParamList = {
  Home: undefined;
  Workouts: undefined;
  Nutrition: undefined;
  Community: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<ClientTabParamList>();

export const ClientTabs: React.FC = () => {
  const { t } = useTranslation();
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
          const w = focused ? 'fill' : 'bold';
          if (route.name === 'Home')      return <House      size={24} color={color} weight={w} />;
          if (route.name === 'Workouts')  return <Barbell    size={24} color={color} weight={w} />;
          if (route.name === 'Nutrition') return <ForkKnife  size={24} color={color} weight={w} />;
          if (route.name === 'Community') return <Users      size={24} color={color} weight={w} />;
          if (route.name === 'Profile')   return <UserCircle size={24} color={color} weight={w} />;
          return null;
        },
      })}
    >
      <Tab.Screen name="Home"      component={HomeScreen}               options={{ tabBarLabel: t('nav.home') }} />
      <Tab.Screen name="Workouts"  component={WorkoutScreen}            options={{ tabBarLabel: t('nav.workouts') }} />
      <Tab.Screen name="Nutrition" component={NutritionDashboardScreen} options={{ tabBarLabel: t('nav.nutrition') }} />
      <Tab.Screen name="Community" component={CommunityFeedScreen}      options={{ tabBarLabel: 'Community' }} />
      <Tab.Screen name="Profile"   component={ProfileScreen}            options={{ tabBarLabel: t('nav.profile') }} />
    </Tab.Navigator>
  );
};
