import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import Onboarding from './screens/onboarding/Onboarding'
import Login from './screens/authentication/Login'
import PersonalInfo from './screens/onboarding/PersonalInfo'
import DiagnosticAssessment from './screens/onboarding/DiagnosticAssessment'
import Home from './screens/navigations/home/Home'
import StudyPlan from './screens/navigations/study/StudyPlan'
import Library from './screens/navigations/study/Library'
import ReadingMaterial from './screens/navigations/study/ReadingMaterial'
import Register from './screens/authentication/Register'
import PracticeLibraryScreen from './screens/navigations/practice/PracticeLibraryScreen.js'
import PracticeScreen from './screens/navigations/practice/PracticeScreen.js'
import Flashcards from './screens/navigations/practice/Flashcards.js'
import Matching from './screens/navigations/practice/Matching'
import TrueFalse from './screens/navigations/practice/TrueFalse'
import MultipleChoice from './screens/navigations/practice/MultipleChoice'
import MockExamHome from './screens/navigations/practice/MockExamHome'
import MockExamTake from './screens/navigations/practice/MockExamTake'
import Performance from './screens/navigations/performance/Performance'
import Profile from './screens/navigations/profile/Profile'
import AccountInformation from './screens/navigations/profile/AccountInformation'
import Settings from './screens/navigations/profile/Settings'
import HelpCenter from './screens/navigations/profile/HelpCenter'
import Report from './screens/navigations/profile/Report'
import TermsConditions from './screens/navigations/profile/TermsConditions'
import RateApp from './screens/navigations/profile/RateApp'
import AboutApp from './screens/navigations/profile/AboutApp'
import BottomNav from './components/BottomNav'

const Stack = createNativeStackNavigator()

// Screens that should show the persistent bottom navbar
const NAV_SCREENS = new Set([
	'Home', 'Library', 'StudyPlan', 'ReadingMaterial',
	'PracticeLibrary', 'PracticeScreen', 'Performance', 'PersonalInfo', 'Profile', 'AccountInformation', 'Settings', 'HelpCenter', 'Report', 'TermsConditions', 'RateApp', 'AboutApp',
])

export default function App() {
	const [loading, setLoading] = useState(true)
	const [currentRoute, setCurrentRoute] = useState('Home')
	const navigationRef = useNavigationContainerRef()

	useEffect(() => {
		const timer = setTimeout(() => setLoading(false), 300)
		return () => clearTimeout(timer)
	}, [])

	const showNav = NAV_SCREENS.has(currentRoute)

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#D9989E" />
			</View>
		)
	}

	return (
		<View style={styles.root}>
			<NavigationContainer
				ref={navigationRef}
				onStateChange={() => {
					const name = navigationRef.getCurrentRoute()?.name
					if (name) setCurrentRoute(name)
				}}
			>
				<Stack.Navigator
					screenOptions={{
						headerShown: false,
						animation: 'fade_from_bottom',
					}}
					initialRouteName="Home"
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
					<Stack.Screen name="Performance" component={Performance} />
					<Stack.Screen name="Profile" component={Profile} />
					<Stack.Screen name="AccountInformation" component={AccountInformation} />
					<Stack.Screen name="Settings" component={Settings} />
					<Stack.Screen name="HelpCenter" component={HelpCenter} />
					<Stack.Screen name="Report" component={Report} />
					<Stack.Screen name="TermsConditions" component={TermsConditions} />
					<Stack.Screen name="RateApp" component={RateApp} />
					<Stack.Screen name="AboutApp" component={AboutApp} />
				</Stack.Navigator>
			</NavigationContainer>

			{/* BottomNav lives OUTSIDE the navigator so it is never animated by screen transitions */}
			{showNav && (
				<BottomNav navigation={navigationRef} activeRoute={currentRoute} />
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#0f1e35',
	},
})
