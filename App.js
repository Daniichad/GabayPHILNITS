import React, { useEffect, useState, useRef } from 'react'
import { Animated, Image, StyleSheet, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationContainer, useNavigationContainerRef, DefaultTheme } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
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
import PracticeOverview from './screens/navigations/practice/PracticeOverview'
import Performance from './screens/navigations/performance/Performance'
import Profile from './screens/navigations/profile/Profile'
import AccountInformation from './screens/navigations/profile/AccountInformation'
import Settings from './screens/navigations/profile/Settings'
import HelpCenter from './screens/navigations/profile/HelpCenter'
import Report from './screens/navigations/profile/Report'
import TermsConditions from './screens/navigations/profile/TermsConditions'
import RateApp from './screens/navigations/profile/RateApp'
import AboutApp from './screens/navigations/profile/AboutApp'
import CseGuide from './screens/navigations/profile/CseGuide'
import BottomNav from './components/BottomNav'
import { supabase } from './utils/supabase'

const Stack = createNativeStackNavigator()

const navTheme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		background: '#0f1e35',
	},
}

// Screens that should show the persistent bottom navbar
const NAV_SCREENS = new Set([
	'Home', 'Library', 'StudyPlan', 'ReadingMaterial',
	'PracticeLibrary', 'PracticeScreen', 'Performance', 'Profile', 'AccountInformation', 'Settings', 'HelpCenter', 'Report', 'TermsConditions', 'RateApp', 'AboutApp', 'PracticeOverview', 'CseGuide',
])

export default function App() {
	const [loading, setLoading] = useState(true)
	const [currentRoute, setCurrentRoute] = useState('Login')
	const [initialRoute, setInitialRoute] = useState('Login')
	const navigationRef = useNavigationContainerRef()
	const fadeAnim = useRef(new Animated.Value(1)).current

	const determineInitialRoute = async () => {
		try {
			// 1. Check if user is logged in
			const { data: { session } } = await supabase.auth.getSession()
			if (session?.user) {
				const userId = session.user.id

				// Check personal info completion
				const { data: personalInfoData } = await supabase
					.from('personal_info')
					.select('user_id')
					.eq('user_id', userId)
					.maybeSingle()

				if (!personalInfoData) {
					return 'PersonalInfo'
				}

				// Check diagnostic assessment completion
				const { data: diagnosticData } = await supabase
					.from('diagnostic_assessment_attempts')
					.select('id')
					.eq('user_id', userId)
					.limit(1)
					.maybeSingle()

				if (!diagnosticData) {
					return 'DiagnosticAssessment'
				}

				return 'Home'
			}

			// 2. If not logged in, check onboarding
			const onboardingComplete = await AsyncStorage.getItem('onboardingComplete')
			if (onboardingComplete === 'true') {
				return 'Login'
			} else {
				return 'Onboarding'
			}
		} catch (err) {
			console.warn('Error determining initial route:', err)
			return 'Onboarding' // Safe fallback
		}
	}

	useEffect(() => {
		const init = async () => {
			const route = await determineInitialRoute()
			setInitialRoute(route)
			setCurrentRoute(route)

			// Hold for 3 seconds, then fade out
			Animated.sequence([
				Animated.delay(3000),
				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 800,
					useNativeDriver: true,
				}),
			]).start(() => {
				setLoading(false)
			})
		}
		init()
	}, [fadeAnim])

	useEffect(() => {
		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'SIGNED_OUT') {
				if (navigationRef.isReady()) {
					navigationRef.reset({
						index: 0,
						routes: [{ name: 'Login' }],
					})
				}
			}
		})

		return () => {
			subscription?.unsubscribe()
		}
	}, [])

	const showNav = NAV_SCREENS.has(currentRoute)

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<Animated.Image
					source={require('./assets/logo_text_dark.png')}
					style={[styles.splashImage, { opacity: fadeAnim }]}
					resizeMode="contain"
				/>
			</View>
		)
	}

	return (
		<SafeAreaProvider>
			<View style={styles.root}>
				<NavigationContainer
					ref={navigationRef}
					theme={navTheme}
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
						initialRouteName="Onboarding"//{initialRoute}
					>
						<Stack.Screen name="Onboarding" component={Onboarding} />
						<Stack.Screen name="Login" component={Login} options={{ animation: 'fade_from_bottom' }} />
						<Stack.Screen name="Register" component={Register} options={{ animation: 'fade_from_bottom' }} />
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
						<Stack.Screen name="PracticeOverview" component={PracticeOverview} />
						<Stack.Screen name="Performance" component={Performance} />
						<Stack.Screen name="Profile" component={Profile} />
						<Stack.Screen name="AccountInformation" component={AccountInformation} />
						<Stack.Screen name="Settings" component={Settings} />
						<Stack.Screen name="HelpCenter" component={HelpCenter} />
						<Stack.Screen name="Report" component={Report} />
						<Stack.Screen name="TermsConditions" component={TermsConditions} />
						<Stack.Screen name="RateApp" component={RateApp} />
						<Stack.Screen name="AboutApp" component={AboutApp} />
						<Stack.Screen name="CseGuide" component={CseGuide} />
					</Stack.Navigator>
				</NavigationContainer>

				{/* BottomNav lives OUTSIDE the navigator so it is never animated by screen transitions */}
				{showNav && (
					<BottomNav navigation={navigationRef} activeRoute={currentRoute} />
				)}
			</View>
		</SafeAreaProvider>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: '#0f1e35',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f5f7fb',
	},
	splashImage: {
		width: '75%',
		height: '75%',
	},
})
