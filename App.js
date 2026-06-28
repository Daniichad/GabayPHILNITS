import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import Onboarding from './screens/Onboarding'
import Login from './screens/Login'
import PersonalInfo from './screens/PersonalInfo'
import DiagnosticAssessment from './screens/DiagnosticAssessment'
import Home from './screens/Home'
import StudyPlan from './screens/StudyPlan'
import Library from './screens/Library'
import ReadingMaterial from './screens/ReadingMaterial'
import Register from './screens/Register'

const Stack = createNativeStackNavigator()

export default function App() {
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const timer = setTimeout(() => setLoading(false), 300)

		return () => clearTimeout(timer)
	}, [])

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#D9989E" />
			</View>
		)
	}

	return (
		<NavigationContainer>
			<Stack.Navigator
				screenOptions={{
					headerShown: false,
					animationEnabled: true,
				}}
				initialRouteName="Library"
			>
				<Stack.Screen name="Onboarding" component={Onboarding} />
				<Stack.Screen name="Login" component={Login} />
				<Stack.Screen name="Register" component={Register} />
				<Stack.Screen name="PersonalInfo" component={PersonalInfo} />
				<Stack.Screen name="DiagnosticAssessment" component={DiagnosticAssessment} />
				<Stack.Screen name="StudyPlan" component={StudyPlan} />
				<Stack.Screen name="Library" component={Library} />
				<Stack.Screen name="ReadingMaterial" component={ReadingMaterial} />
				<Stack.Screen name="Home" component={Home} />
			</Stack.Navigator>
		</NavigationContainer>
	)
}

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#0f1e35',
	},
})

