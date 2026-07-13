import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import Onboarding from './screens/onboarding/Onboarding'
import Login from './screens/authentication/Login'
import PersonalInfo from './screens/onboarding/PersonalInfo'
import DiagnosticAssessment from './screens/onboarding/DiagnosticAssessment'
import Home from './screens/navigations/home/Home'
import StudyPlan from './screens/navigations/study/StudyPlan'
import Library from './screens/Library'
import ReadingMaterial from './screens/ReadingMaterial'
import Register from './screens/authentication/Register'
import PracticeLibraryScreen from './screens/navigations/practice/PracticeLibraryScreen.js'
import PracticeScreen from './screens/navigations/practice/PracticeScreen.js'
import Flashcards from './screens/navigations/practice/Flashcards.js'
import Matching from './screens/navigations/practice/Matching'
import TrueFalse from './screens/navigations/practice/TrueFalse'
import MultipleChoice from './screens/navigations/practice/MultipleChoice'
import MockExamHome from './screens/navigations/practice/MockExamHome'
import MockExamTake from './screens/navigations/practice/MockExamTake'

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
				initialRouteName="MockExamHome"
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
				<Stack.Screen name="PracticeLibrary" component={PracticeLibraryScreen} />
				<Stack.Screen name="PracticeScreen" component={PracticeScreen} />
				<Stack.Screen name="Flashcards" component={Flashcards} />
				<Stack.Screen name="Matching" component={Matching} />
				<Stack.Screen name="TrueFalse" component={TrueFalse} />
				<Stack.Screen name="MultipleChoice" component={MultipleChoice} />
				<Stack.Screen name="MockExamHome" component={MockExamHome} />
				<Stack.Screen name="MockExamTake" component={MockExamTake} />
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

