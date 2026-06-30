// Navigation/RootNavigator.js
import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Import Screens
import Onboarding from '../screens/Onboarding'
import LoginScreen from '../screens/LoginScreen'
import RegisterScreen from '../screens/RegisterScreen'
import HomeScreen from '../screens/HomeScreen'
import SplashScreen from '../screens/SplashScreen'

const Stack = createNativeStackNavigator()

export default function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      // Check if user has completed onboarding
      const onboardingComplete = await AsyncStorage.getItem('onboardingComplete')
      const userToken = await AsyncStorage.getItem('userToken')

      if (onboardingComplete === 'true' && userToken) {
        setInitialRoute('Home')
      } else if (onboardingComplete === 'true') {
        setInitialRoute('Login')
      } else {
        setInitialRoute('Onboarding')
      }
    } catch (error) {
      console.error('Error checking onboarding:', error)
      setInitialRoute('Onboarding')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <SplashScreen />
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        {/* Onboarding Flow */}
        <Stack.Screen
          name="Onboarding"
          component={Onboarding}
          options={{ animationEnabled: false }}
        />

        {/* Auth Flow */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* Main App Flow */}
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}