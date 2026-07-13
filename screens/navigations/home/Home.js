import React from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { supabase } from '../../../utils/supabase'
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons'

export default function Home({ session, navigation }) {
	const user = session?.user
	const displayName = user?.user_metadata?.full_name || user?.user_metadata?.fullName || user?.email || 'User'
	const firstName = displayName.split(' ')[0] || 'Name'

	const handleLogout = async () => {
		const { error } = await supabase.auth.signOut()

		if (error) {
			Alert.alert('Logout error', error.message || 'Could not sign out')
		}
	}

	const subjects = [
		{ label: 'Verbal Ability', progress: 0.08 },
		{ label: 'Numerical Ability', progress: 0.0 },
		{ label: 'Analytical Ability', progress: 0.15 },
		{ label: 'Logical Reasoning', progress: 0.1 },
		{ label: 'General Information', progress: 0.0 },
		{ label: 'Clerical Operations', progress: 0.0 },
	]

	return (
		<View style={styles.screen}>
			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				<View style={styles.topRow}>
					<View style={styles.brandMark}>
						<Text style={styles.brandText}>G</Text>
					</View>

					<View style={styles.topIcons}>
						<View style={styles.topBadge}>
							<Feather name="zap" size={18} color="#0f2747" />
							<Text style={styles.topBadgeText}>1</Text>
						</View>
						<TouchableOpacity onPress={handleLogout} style={styles.notificationButton} activeOpacity={0.8}>
							<Ionicons name="notifications-outline" size={24} color="#0f2747" />
						</TouchableOpacity>
					</View>
				</View>

				<View style={styles.heroCard}>
					<Text style={styles.greeting}>Hello, {firstName}!</Text>
					<Text style={styles.greetingSub}>Your CSE journey continues today.</Text>
					<TouchableOpacity style={styles.studyPlanButton} activeOpacity={0.85} onPress={() => navigation?.navigate('StudyPlan')}>
						<Text style={styles.studyPlanText}>Today’s Study Plan</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.quoteCard}>
					<Text style={styles.quoteText}>
						"Success is the sum of small efforts repeated day in and day out."
					</Text>
				</View>

				<View style={styles.metricsRow}>
					<View style={styles.metricCard}>
						<Text style={styles.metricValue}>33.3%</Text>
						<Text style={styles.metricLabel}>Exam Readiness</Text>
					</View>
					<View style={styles.metricCard}>
						<Text style={styles.metricValue}>45 <Text style={styles.metricUnit}>days</Text></Text>
						<Text style={styles.metricLabel}>until next CSE exam</Text>
					</View>
				</View>

				<View style={styles.updatesCard}>
					<Text style={styles.updatesTitle}>CSE UPDATES</Text>
					<View style={styles.updateRow}>
						<Text style={styles.updateLabel}>Next CSE Schedule:</Text>
						<Text style={styles.updateValue}>March 2026</Text>
					</View>
					<View style={styles.updateRow}>
						<Text style={styles.updateLabel}>Application Period:</Text>
						<Text style={styles.updateValue}>January 2026</Text>
					</View>
					<TouchableOpacity style={styles.visitButton} activeOpacity={0.85}>
						<Text style={styles.visitButtonText}>Visit CSC Page</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.actionRow}>
					<TouchableOpacity style={[styles.actionCard, styles.actionCardBlue]} activeOpacity={0.85}>
						<Text style={styles.actionText}>Take{"\n"}Mock Exam</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[styles.actionCard, styles.actionCardCream]} activeOpacity={0.85}>
						<Text style={styles.actionText}>Review{"\n"}Flashcards</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.subjectCard}>
					<Text style={styles.subjectTitle}>Your Subject Areas</Text>

					{subjects.map((subject) => (
						<View key={subject.label} style={styles.subjectItem}>
							<Text style={styles.subjectLabel}>{subject.label}</Text>
							<View style={styles.progressTrack}>
								<View style={[styles.progressFill, { width: `${Math.max(subject.progress * 100, 8)}%` }]} />
							</View>
						</View>
					))}

					<TouchableOpacity style={styles.diagnosticButton} activeOpacity={0.85} onPress={() => navigation?.navigate('DiagnosticAssessment')}>
						<Text style={styles.diagnosticText}>Take Diagnostic</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>

			<TouchableOpacity style={styles.fab} activeOpacity={0.85}>
				<MaterialCommunityIcons name="tools" size={26} color="#fff" />
			</TouchableOpacity>

				<View style={styles.bottomNav}>
					<NavIcon active icon={<Ionicons name="home" size={26} color="#0f2747" />} onPress={() => navigation?.navigate('Home')} />
					<NavIcon icon={<Ionicons name="document-text-outline" size={26} color="#64748b" />} onPress={() => navigation?.navigate('Library')} />
					<NavIcon icon={<Feather name="clipboard" size={24} color="#64748b" />} onPress={() => navigation?.navigate('')} />
					<NavIcon icon={<Feather name="bar-chart-2" size={24} color="#64748b" />} onPress={() => navigation?.navigate('DiagnosticAssessment')} />
					<NavIcon icon={<Feather name="user" size={24} color="#64748b" />} onPress={() => navigation?.navigate('PersonalInfo')} />
			</View>
		</View>
	)
}

function NavIcon({ icon, onPress, active = false }) {
	return (
		<TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.navIconWrap, active && styles.navIconActive]}>
			{icon}
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	scrollContent: {
		paddingTop: 16,
		paddingHorizontal: 12,
		paddingBottom: 124,
	},
	topRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 8,
		marginBottom: 18,
	},
	brandMark: {
		width: 38,
		height: 38,
		justifyContent: 'center',
		alignItems: 'center',
	},
	brandText: {
		fontSize: 26,
		fontWeight: '900',
		color: '#d85e67',
	},
	topIcons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
	},
	topBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	topBadgeText: {
		fontSize: 13,
		color: '#0f2747',
		fontWeight: '700',
	},
	notificationButton: {
		padding: 2,
	},
	heroCard: {
		backgroundColor: '#dbe8fb',
		borderRadius: 22,
		padding: 18,
		marginBottom: 12,
	},
	greeting: {
		fontSize: 28,
		fontWeight: '800',
		color: '#13294b',
		marginBottom: 4,
	},
	greetingSub: {
		fontSize: 14,
		color: '#1f3b63',
		marginBottom: 12,
	},
	studyPlanButton: {
		backgroundColor: '#ffffff',
		borderRadius: 14,
		paddingVertical: 11,
		alignItems: 'center',
	},
	studyPlanText: {
		fontSize: 18,
		color: '#13294b',
		fontWeight: '600',
	},
	quoteCard: {
		backgroundColor: '#f8eee8',
		borderRadius: 18,
		paddingVertical: 26,
		paddingHorizontal: 24,
		marginBottom: 12,
	},
	quoteText: {
		fontSize: 17,
		lineHeight: 24,
		textAlign: 'center',
		color: '#13294b',
	},
	metricsRow: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 12,
	},
	metricCard: {
		flex: 1,
		borderWidth: 1.5,
		borderColor: '#13294b',
		borderRadius: 18,
		paddingVertical: 14,
		paddingHorizontal: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	metricValue: {
		fontSize: 30,
		fontWeight: '800',
		color: '#13294b',
		textAlign: 'center',
	},
	metricUnit: {
		fontSize: 12,
		fontWeight: '600',
	},
	metricLabel: {
		fontSize: 12,
		color: '#64748b',
		textAlign: 'center',
		marginTop: 4,
	},
	updatesCard: {
		backgroundColor: '#d99aa4',
		borderRadius: 22,
		padding: 18,
		marginBottom: 12,
	},
	updatesTitle: {
		fontSize: 18,
		fontWeight: '800',
		color: '#fff',
		marginBottom: 12,
	},
	updateRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 4,
	},
	updateLabel: {
		fontSize: 15,
		color: '#fff',
		flex: 1,
		paddingRight: 12,
	},
	updateValue: {
		fontSize: 15,
		fontWeight: '800',
		color: '#fff',
	},
	visitButton: {
		marginTop: 12,
		alignSelf: 'center',
		backgroundColor: '#fff',
		borderRadius: 14,
		paddingVertical: 10,
		paddingHorizontal: 18,
	},
	visitButtonText: {
		fontSize: 16,
		color: '#13294b',
		fontWeight: '700',
	},
	actionRow: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 12,
	},
	actionCard: {
		flex: 1,
		borderRadius: 18,
		paddingVertical: 28,
		paddingHorizontal: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionCardBlue: {
		backgroundColor: '#dbe8fb',
	},
	actionCardCream: {
		backgroundColor: '#f8eee8',
	},
	actionText: {
		fontSize: 24,
		lineHeight: 28,
		textAlign: 'center',
		color: '#13294b',
		fontWeight: '600',
	},
	subjectCard: {
		backgroundColor: '#ffffff',
		borderRadius: 22,
		padding: 18,
		borderWidth: 1.5,
		borderColor: '#13294b',
	},
	subjectTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#13294b',
		marginBottom: 14,
	},
	subjectItem: {
		marginBottom: 14,
	},
	subjectLabel: {
		fontSize: 16,
		color: '#13294b',
		marginBottom: 8,
	},
	progressTrack: {
		height: 8,
		borderRadius: 999,
		backgroundColor: '#dbe8fb',
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		borderRadius: 999,
		backgroundColor: '#1f1f4f',
	},
	diagnosticButton: {
		marginTop: 6,
		alignSelf: 'center',
		backgroundColor: '#dbe8fb',
		borderRadius: 14,
		paddingVertical: 11,
		paddingHorizontal: 22,
	},
	diagnosticText: {
		fontSize: 16,
		color: '#13294b',
		fontWeight: '700',
	},
	fab: {
		position: 'absolute',
		right: 18,
		bottom: 82,
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: '#0f2747',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.22,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 6,
	},
	bottomNav: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		height: 74,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#d8e0f0',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		paddingBottom: 8,
	},
	navIconWrap: {
		width: 42,
		height: 42,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 21,
	},
	navIconActive: {
		backgroundColor: 'rgba(15, 39, 71, 0.08)',
	},
})