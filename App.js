import React, { useEffect, useState, useRef } from 'react'
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from 'react-native'
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
import VideoLectureDetail from './screens/navigations/study/VideoLectureDetail'
import RecentReads from './screens/navigations/study/RecentReads'
import Register from './screens/authentication/Register'
import SetPin from './screens/authentication/SetPin'
import PinAuth from './screens/authentication/PinAuth'
import PracticeLibraryScreen from './screens/navigations/practice/PracticeLibraryScreen.js'
import Flashcards from './screens/navigations/practice/Flashcards.js'
import Matching from './screens/navigations/practice/Matching'
import TrueFalse from './screens/navigations/practice/TrueFalse'
import MultipleChoice from './screens/navigations/practice/MultipleChoice'
import MockExamHome from './screens/navigations/practice/MockExamHome'
import MockExamTake from './screens/navigations/practice/MockExamTake'
import MockExamResult from './screens/navigations/practice/MockExamResult'
import PracticeOverview from './screens/navigations/practice/PracticeOverview'
import PracticeResult from './screens/navigations/practice/PracticeResult'
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
import CseSitesNearMe from './screens/navigations/profile/CseSitesNearMe'
import ActivityCalendar from './screens/navigations/home/ActivityCalendar'
import { Feather } from '@expo/vector-icons'
import BottomNav from './components/BottomNav'
import EdgeHandleAI from './components/EdgeHandleAI'
import OfflineToast from './components/OfflineToast'
import NotificationToast from './components/NotificationToast'
import { supabase } from './utils/supabase'
import NetInfo from '@react-native-community/netinfo'
import { initDb, getUserCache, saveUserCache, saveUserSession, getActiveUserSession } from './utils/database'
import { processSyncQueue, precachePracticeContent, addSyncListener } from './utils/syncManager'
import { startRealtimeNotifications, stopRealtimeNotifications } from './utils/notificationManager'

const Stack = createNativeStackNavigator()

const navTheme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		background: '#0f1e35',
	},
}

const NAV_SCREENS = new Set([
	'Home', 'Library',
	'PracticeLibrary', 'Performance', 'Profile', 'AccountInformation', 'Settings', 'HelpCenter', 'Report', 'TermsConditions', 'RateApp', 'AboutApp', 'CseGuide', 'CseSitesNearMe',
])

const MAIN_TAB_SCREENS = new Set([
	'Home', 'Library', 'PracticeLibrary', 'Performance', 'Profile',
])

export default function App() {
	const [loading, setLoading] = useState(true)
	const [currentRoute, setCurrentRoute] = useState('Login')
	const [initialRoute, setInitialRoute] = useState('Login')
	const [isOffline, setIsOffline] = useState(false)
	const [syncNotice, setSyncNotice] = useState(null)
	const navigationRef = useNavigationContainerRef()
	const fadeAnim = useRef(new Animated.Value(1)).current

	const determineInitialRoute = async () => {
		try {
			const netState = await NetInfo.fetch()
			const isOnline = Boolean(netState.isConnected)
			setIsOffline(!isOnline)

			let activeUser = null

			// 1. If online, check Supabase session
			if (isOnline) {
				try {
					const { data: { session }, error } = await supabase.auth.getSession()
					if (!error && session?.user) {
						activeUser = session.user
						await saveUserSession(session.user)
						precachePracticeContent().catch(() => { })
					}
				} catch (netErr) {
					console.warn('Network issue fetching session, will check local cache:', netErr)
				}
			}

			// 2. If offline or no remote session returned, check cached user session in SQLite
			if (!activeUser) {
				const localSession = await getActiveUserSession()
				if (localSession?.user_id) {
					const cachedData = await getUserCache(localSession.user_id)
					if (cachedData) {
						if (!cachedData.personal_info_completed) return 'PersonalInfo'
						if (!cachedData.diagnostic_completed) return 'DiagnosticAssessment'
					}
					const hasCachedPin = Boolean(localSession.hasPin || (cachedData?.pin_hash && String(cachedData.pin_hash).trim().length > 0))
					return hasCachedPin ? 'PinAuth' : 'Home'
				}
			}

			if (activeUser) {
				const userId = activeUser.id

				if (!isOnline) {
					const cachedData = await getUserCache(userId)
					if (cachedData) {
						if (!cachedData.personal_info_completed) return 'PersonalInfo'
						if (!cachedData.diagnostic_completed) return 'DiagnosticAssessment'
						const hasCachedPin = Boolean(cachedData.pin_hash && String(cachedData.pin_hash).trim().length > 0)
						return hasCachedPin ? 'PinAuth' : 'Home'
					}
					return 'Home'
				}

				// Check personal info completion
				const { data: personalInfoData } = await supabase
					.from('personal_info')
					.select('user_id, target_exam_level')
					.eq('user_id', userId)
					.maybeSingle()

				if (!personalInfoData) {
					await saveUserCache(userId, null, false, false)
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
					await saveUserCache(userId, null, true, false)
					return 'DiagnosticAssessment'
				}

				// Check if user has a PIN — if so, gate with PinAuth
				const userEmail = activeUser.email
				const { data: userData } = await supabase
					.from('users')
					.select('pin_hash')
					.ilike('email', userEmail)
					.maybeSingle()

				const hasPin = Boolean(userData?.pin_hash && String(userData.pin_hash).trim().length > 0)
				await saveUserCache(userId, hasPin ? userData.pin_hash : null, true, true)
				await saveUserSession(activeUser, {
					pin_hash: hasPin ? userData.pin_hash : null,
					target_exam_level: personalInfoData.target_exam_level || ''
				})
				return hasPin ? 'PinAuth' : 'Home'
			}

			// 3. If not logged in, check onboarding
			const onboardingComplete = await AsyncStorage.getItem('onboardingComplete')
			if (onboardingComplete === 'true') {
				return 'Login'
			} else {
				return 'Onboarding'
			}
		} catch (err) {
			console.warn('Error determining initial route:', err)
			return 'Onboarding'
		}
	}

	useEffect(() => {
		const init = async () => {
			await initDb()
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
		const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
			if (event === 'SIGNED_OUT') {
				if (navigationRef.isReady()) {
					navigationRef.reset({
						index: 0,
						routes: [{ name: 'Login' }],
					})
				}
			} else if (event === 'TOKEN_REFRESHED') {
				// Token refreshed successfully — nothing to do
			} else if (event === 'TOKEN_REFRESH_ERROR') {
				// Refresh token is invalid/expired — clear session ONLY if online!
				const net = await NetInfo.fetch()
				if (net.isConnected) {
					console.warn('Refresh token invalid, signing out...')
					await supabase.auth.signOut()
				}
			}
		})

		return () => {
			subscription?.unsubscribe()
		}
	}, [])

	useEffect(() => {
		const unsubscribeNet = NetInfo.addEventListener(state => {
			const offline = !state.isConnected
			setIsOffline(offline)
			if (!offline) {
				processSyncQueue()
				precachePracticeContent().catch(() => { })
			}
		})

		const unsubscribeSync = addSyncListener(({ status }) => {
			if (status === 'SYNCING') {
				setSyncNotice('syncing')
			} else if (status === 'COMPLETED') {
				setSyncNotice('synced')
				setTimeout(() => setSyncNotice(null), 3500)
			}
		})

		return () => {
			unsubscribeNet()
			unsubscribeSync()
		}
	}, [])

	useEffect(() => {
		startRealtimeNotifications()
		return () => {
			stopRealtimeNotifications()
		}
	}, [])

	const activeRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute() : null
	const activeRouteName = activeRoute?.name || currentRoute
	const showNav = NAV_SCREENS.has(activeRouteName) && !(activeRoute?.params?.hideNav)
	const showEdgeHandle = MAIN_TAB_SCREENS.has(activeRouteName) && !(activeRoute?.params?.hideNav)

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
				{/* Global Realtime Notification Toaster (Active on all pages) */}
				<NotificationToast navigationRef={navigationRef} />

				{/* Floating Offline / Sync Toaster UI */}
				<OfflineToast isOffline={isOffline} syncNotice={syncNotice} />

				<NavigationContainer
					ref={navigationRef}
					theme={navTheme}
					onReady={() => {
						const name = navigationRef.getCurrentRoute()?.name
						if (name) setCurrentRoute(name)
					}}
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
						initialRouteName={initialRoute}
					>
						<Stack.Screen name="Onboarding" component={Onboarding} />
						<Stack.Screen name="Login" component={Login} options={{ animation: 'fade_from_bottom' }} />
						<Stack.Screen name="Register" component={Register} options={{ animation: 'fade_from_bottom' }} />
						<Stack.Screen name="SetPin" component={SetPin} options={{ animation: 'slide_from_bottom' }} />
						<Stack.Screen name="PinAuth" component={PinAuth} options={{ animation: 'fade', gestureEnabled: false }} />
						<Stack.Screen name="PersonalInfo" component={PersonalInfo} />
						<Stack.Screen name="DiagnosticAssessment" component={DiagnosticAssessment} />
						<Stack.Screen name="StudyPlan" component={StudyPlan} />
						<Stack.Screen name="Library" component={Library} />
						<Stack.Screen name="ReadingMaterial" component={ReadingMaterial} />
						<Stack.Screen name="RecentReads" component={RecentReads} />
						<Stack.Screen name="VideoLectureDetail" component={VideoLectureDetail} />
						<Stack.Screen name="Home" component={Home} />
						<Stack.Screen name="PracticeLibrary" component={PracticeLibraryScreen} />
						<Stack.Screen name="Flashcards" component={Flashcards} />
						<Stack.Screen name="Matching" component={Matching} />
						<Stack.Screen name="TrueFalse" component={TrueFalse} />
						<Stack.Screen name="MultipleChoice" component={MultipleChoice} />
						<Stack.Screen name="MockExamHome" component={MockExamHome} />
						<Stack.Screen name="MockExamTake" component={MockExamTake} />
						<Stack.Screen name="MockExamResult" component={MockExamResult} />
						<Stack.Screen name="PracticeOverview" component={PracticeOverview} />
						<Stack.Screen name="PracticeResult" component={PracticeResult} />
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
						<Stack.Screen name="CseSitesNearMe" component={CseSitesNearMe} />
						<Stack.Screen name="ActivityCalendar" component={ActivityCalendar} />
					</Stack.Navigator>
				</NavigationContainer>

				{/* Floating Edge Handle for GABAY AI Assistant */}
				{showEdgeHandle && <EdgeHandleAI side="right" />}

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
		backgroundColor: '#fff',
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
