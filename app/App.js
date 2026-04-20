import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AppSplashScreen from './src/screens/AppSplashScreen';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
  PlayfairDisplay_900Black,
  PlayfairDisplay_900Black_Italic,
} from '@expo-google-fonts/playfair-display';
import { SpecialElite_400Regular } from '@expo-google-fonts/special-elite';
import {
  CourierPrime_400Regular,
  CourierPrime_400Regular_Italic,
  CourierPrime_700Bold,
} from '@expo-google-fonts/courier-prime';

import MapScreen from './src/screens/MapScreen';
import VaultScreen from './src/screens/VaultScreen';
import CrewScreen from './src/screens/CrewScreen';
import CrewMemberDetailScreen from './src/screens/CrewMemberDetailScreen';
import HeistBriefingScreen from './src/screens/HeistBriefingScreen';
import GameplayScreen from './src/screens/GameplayScreen';
import HeistResultScreen from './src/screens/HeistResultScreen';
import { COLORS } from './src/constants/colors';
import { GameStateProvider } from './src/context/GameStateContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const CrewStack = createNativeStackNavigator();

function CrewStackNav() {
  return (
    <CrewStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <CrewStack.Screen name="Crew" component={CrewScreen} />
      <CrewStack.Screen name="CrewMemberDetail" component={CrewMemberDetailScreen} />
    </CrewStack.Navigator>
  );
}

function MapStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen
        name="HeistBriefing"
        component={HeistBriefingScreen}
        options={({ route }) => ({
          animation: route.params?.animation ?? 'slide_from_right',
        })}
      />
      <Stack.Screen name="Gameplay" component={GameplayScreen} />
      <Stack.Screen name="HeistResult" component={HeistResultScreen} />
    </Stack.Navigator>
  );
}

function TabIcon({ label, icon, focused }) {
  return (
    <View style={tabIconStyles.container}>
      <Text style={tabIconStyles.icon}>{icon}</Text>
      <Text style={[tabIconStyles.label, focused && tabIconStyles.labelFocused]} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    width: 60,
  },
  icon: {
    fontSize: 20,
    marginBottom: 2,
  },
  label: {
    fontFamily: 'SpecialElite_400Regular',
    fontSize: 8,
    color: COLORS.muted,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  labelFocused: {
    color: COLORS.gold,
  },
});

// Keep the native splash screen visible until we're ready to show our own.
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    PlayfairDisplay_900Black,
    PlayfairDisplay_900Black_Italic,
    SpecialElite_400Regular,
    CourierPrime_400Regular,
    CourierPrime_400Regular_Italic,
    CourierPrime_700Bold,
  });

  const [splashDone, setSplashDone] = useState(false);

  // Called once fonts are loaded — hide the native splash and show our logo screen.
  const handleLayout = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  if (!splashDone) {
    return (
      <View style={{ flex: 1 }} onLayout={handleLayout}>
        <AppSplashScreen onFinished={() => setSplashDone(true)} />
      </View>
    );
  }

  return (
    <GameStateProvider>
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.primaryDark,
            borderTopColor: COLORS.border,
            borderTopWidth: 1,
            height: 70,
          },
          tabBarShowLabel: false,
        }}
      >
        <Tab.Screen
          name="MapTab"
          component={MapStack}
          options={({ route }) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'Map';
            const hideTabBar = routeName === 'Gameplay' || routeName === 'HeistResult';
            return {
              tabBarIcon: ({ focused }) => (
                <TabIcon label="HEISTS" icon="🔓" focused={focused} />
              ),
              tabBarStyle: hideTabBar
                ? { display: 'none' }
                : { backgroundColor: COLORS.primaryDark, borderTopColor: COLORS.border, borderTopWidth: 1, height: 70 },
            };
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate('MapTab', { screen: 'Map' });
            },
          })}
        />
        <Tab.Screen
          name="CrewTab"
          component={CrewStackNav}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon label="CREW" icon="🤝" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="VaultTab"
          component={VaultScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon label="VAULT" icon="🏛️" focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
    </GameStateProvider>
  );
}

