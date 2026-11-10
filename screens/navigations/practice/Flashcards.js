import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, StatusBar, Platform, ActivityIndicator,
  Modal, Switch, ScrollView, Dimensions, PanResponder
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../../../supabase';
import {
  getActiveUserSession,
  cacheQuestionsLocally,
  getLocalQuestions,
  enqueueSync,
} from '../../../utils/database';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 44, 400);
const CARD_HEIGHT = Math.min(Math.max(Math.round(SCREEN_HEIGHT * 0.44), 360), 430);

const NAVY = '#0B2540';
const SETTINGS_KEY = '@gabay_flashcard_settings';

export default function Flashcards({ navigation, route }) {
  const deckId    = route?.params?.deckId;
  const categoryId = route?.params?.categoryId;
  const from      = route?.params?.from;

  const handleBack = () => {
    if (from === 'Home') navigation?.navigate('Home');
    else navigation?.goBack?.();
  };

  const [cards,     setCards]     = useState([]);
  const [deckTitle, setDeckTitle] = useState('Flashcards');
  const [index,     setIndex]     = useState(0);
  const [flipped,   setFlipped]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [userId,    setUserId]    = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [completed, setCompleted] = useState(false);

  // ── Swipe & Review Session State ──
  const [studyAgainCards, setStudyAgainCards] = useState([]);
  const [masteredCount,   setMasteredCount]   = useState(0);
  const [totalCardsCount, setTotalCardsCount] = useState(0);
  const [round,           setRound]           = useState(1);

  const pan = useRef(new Animated.ValueXY()).current;
  const isSwipingRef = useRef(false);

  // Synchronization refs to avoid stale closures in PanResponder
  const cardsRef = useRef(cards);
  const indexRef = useRef(index);
  const studyAgainCardsRef = useRef(studyAgainCards);
  const masteredCountRef = useRef(masteredCount);
  const totalCardsCountRef = useRef(totalCardsCount);
  const roundRef = useRef(round);
  const flippedRef = useRef(flipped);
  const autoResetSideRef = useRef(autoResetSide);

  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { studyAgainCardsRef.current = studyAgainCards; }, [studyAgainCards]);
  useEffect(() => { masteredCountRef.current = masteredCount; }, [masteredCount]);
  useEffect(() => { totalCardsCountRef.current = totalCardsCount; }, [totalCardsCount]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { flippedRef.current = flipped; }, [flipped]);
  useEffect(() => { autoResetSideRef.current = autoResetSide; }, [autoResetSide]);

  // ── Flashcard Study Settings ──
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [frontSide, setFrontSide] = useState('definition'); // 'definition' or 'term'
  const [isShuffle, setIsShuffle] = useState(true);
  const [autoResetSide, setAutoResetSide] = useState(true);
  const rawCardsRef = useRef([]);

  const subject    = route?.params?.subject;
  const limit      = route?.params?.limit ?? 10;
  const passedTargetExam = route?.params?.targetExam;
  const feSection  = route?.params?.feSection; // 'morning' | 'afternoon'

  const flipAnim = useRef(new Animated.Value(0)).current;

  // Load saved settings
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (raw) {
        try {
          const s = JSON.parse(raw);
          if (s.frontSide) setFrontSide(s.frontSide);
          if (s.isShuffle !== undefined) setIsShuffle(s.isShuffle);
          if (s.autoResetSide !== undefined) setAutoResetSide(s.autoResetSide);
        } catch (_) {}
      }
    });
    loadData();
  }, []);

  const saveSettings = async (updates) => {
    try {
      const merged = { frontSide, isShuffle, autoResetSide, ...updates };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    } catch (_) {}
  };

  const applyDeckOrder = (shufflePref = isShuffle) => {
    if (rawCardsRef.current.length === 0) return;
    const base = [...rawCardsRef.current];
    const ordered = shufflePref ? base.sort(() => 0.5 - Math.random()) : base;
    cardsRef.current = ordered;
    indexRef.current = 0;
    studyAgainCardsRef.current = [];
    masteredCountRef.current = 0;
    roundRef.current = 1;
    totalCardsCountRef.current = base.length;
    flippedRef.current = false;

    setTotalCardsCount(base.length);
    setCards(ordered);
    setStudyAgainCards([]);
    setMasteredCount(0);
    setRound(1);
    setIndex(0);
    pan.setValue({ x: 0, y: 0 });
    flipAnim.setValue(0);
    setFlipped(false);
  };

  const restartDeck = () => {
    pan.setValue({ x: 0, y: 0 });
    flipAnim.setValue(0);
    flippedRef.current = false;
    setFlipped(false);
    const base = [...rawCardsRef.current];
    const ordered = isShuffle ? base.sort(() => 0.5 - Math.random()) : base;
    cardsRef.current = ordered;
    indexRef.current = 0;
    studyAgainCardsRef.current = [];
    masteredCountRef.current = 0;
    roundRef.current = 1;
    totalCardsCountRef.current = base.length;

    setTotalCardsCount(base.length);
    setCards(ordered);
    setStudyAgainCards([]);
    setMasteredCount(0);
    setRound(1);
    setIndex(0);
    setCompleted(false);
    setStartTime(Date.now());
  };

  // ------------------------------------------------------------
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      let uid = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        uid = session?.user?.id ?? null;
      } catch (_) {}

      if (!uid) {
        const localSession = await getActiveUserSession();
        uid = localSession?.user_id ?? null;
      }
      setUserId(uid);

      // Resolve user's target exam (IP or FE)
      let activeTrack = passedTargetExam || 'IP';
      if (!passedTargetExam && uid) {
        try {
          const { data: pData } = await supabase
            .from('personal_info')
            .select('target_exam_level')
            .eq('user_id', uid)
            .maybeSingle();
          if (pData?.target_exam_level) {
            const lvl = pData.target_exam_level.toLowerCase();
            activeTrack = (lvl.includes('fe') || lvl.includes('fundamental') || (lvl.includes('pro') && !lvl.includes('sub')))
              ? 'FE'
              : 'IP';
          }
        } catch (_) {}
      }

      const IP_SUBJECTS = ['Technology', 'Management', 'Strategy'];
      const FE_MORNING_SUBJECTS = [
        'Computer Systems & Architecture',
        'Networks & Security',
        'IT Management & Strategy',
        'Databases & SQL',
        'Technology',
        'Management',
        'Strategy',
      ];
      const FE_AFTERNOON_SUBJECTS = [
        'Algorithms & Programming',
        'Algorithms & Data Structures',
        'Security & System Design',
      ];

      let trackSubjects = IP_SUBJECTS;
      if (activeTrack === 'FE') {
        const isSubjectB = String(feSection || '').toLowerCase().includes('b') || String(feSection || '').toLowerCase().includes('afternoon');
        if (isSubjectB) {
          trackSubjects = FE_AFTERNOON_SUBJECTS;
        } else {
          trackSubjects = FE_MORNING_SUBJECTS;
        }
      }
      const cacheScope = `${activeTrack.toLowerCase()}_${feSection || 'all'}_${subject || 'all'}`;

      let loadedCards = [];
      const net = await NetInfo.fetch();

      // 1. Try remote fetch if online
      if (net.isConnected) {
        try {
          let cq = supabase.from('flashcards')
            .select('*, flashcard_decks!inner(category_id, exam_level, practice_categories!inner(name, exam_level))');
          cq = cq.eq('flashcard_decks.exam_level', activeTrack);
          if (subject) {
            cq = cq.eq('flashcard_decks.practice_categories.name', subject);
          } else {
            cq = cq.in('flashcard_decks.practice_categories.name', trackSubjects);
          }
          
          const { data: flashcards, error: cErr } = await cq.limit(limit);
          if (!cErr && flashcards && flashcards.length > 0) {
            loadedCards = flashcards;
            cacheQuestionsLocally('flashcard', cacheScope, flashcards).catch(() => {});
          }
        } catch (netErr) {
          console.warn('Network issue loading flashcards, falling back to SQLite:', netErr);
        }
      }

      // 2. Fall back to local SQLite cache
      if (loadedCards.length === 0) {
        const localCards = await getLocalQuestions('flashcard', cacheScope, limit);
        if (localCards && localCards.length > 0) {
          loadedCards = localCards;
        }
      }

      if (loadedCards.length === 0) {
        setError('No flashcards available offline. Connect to the internet once to download flashcards.');
        return;
      }

      rawCardsRef.current = loadedCards;
      const initialCards = isShuffle ? [...loadedCards].sort(() => 0.5 - Math.random()) : [...loadedCards];
      cardsRef.current = initialCards;
      indexRef.current = 0;
      studyAgainCardsRef.current = [];
      masteredCountRef.current = 0;
      roundRef.current = 1;
      totalCardsCountRef.current = loadedCards.length;
      flippedRef.current = false;

      setTotalCardsCount(loadedCards.length);
      setCards(initialCards);
      setStudyAgainCards([]);
      setMasteredCount(0);
      setRound(1);
      setIndex(0);

      // Create session log
      if (uid && initialCards.length > 0) {
        const payload = {
          user_id: uid,
          cards_total: initialCards.length,
          cards_seen: 0,
          completed: false,
          created_at: new Date().toISOString(),
        };
        const activeDeckId = deckId || initialCards[0]?.deck_id;
        if (activeDeckId) {
          payload.deck_id = activeDeckId;
        }

        if (net.isConnected) {
          try {
            const { data: sess } = await supabase
              .from('flashcard_sessions')
              .insert(payload)
              .select().single();
            if (sess) setSessionId(sess.id);
          } catch (_) {
            enqueueSync('flashcard_sessions', 'INSERT', payload);
          }
        } else {
          enqueueSync('flashcard_sessions', 'INSERT', payload);
        }
      }
      setStartTime(Date.now());
    } catch (err) {
      console.error('Flashcards load error:', err);
      setError('Failed to load flashcards.');
    } finally {
      setLoading(false);
    }
  };

  const updateSession = async (seen, completed = false) => {
    if (!sessionId) return;
    const payload = { cards_seen: seen, completed };
    if (completed) {
      payload.completed_at = new Date().toISOString();
      payload.duration_seconds = startTime ? Math.round((Date.now() - startTime) / 1000) : null;
    }

    try {
      const net = await NetInfo.fetch();
      if (net.isConnected) {
        await supabase.from('flashcard_sessions').update(payload).eq('id', sessionId);
        return;
      }
    } catch (_) {}

    // Offline fallback
    await enqueueSync('flashcard_sessions', 'UPDATE', { id: sessionId, ...payload });
  };

  // ------------------------------------------------------------
  const card = cards[index];

  const flipCard = () => {
    const nextFlipped = !flippedRef.current;
    Animated.spring(flipAnim, {
      toValue: nextFlipped ? 180 : 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
    flippedRef.current = nextFlipped;
    setFlipped(nextFlipped);
  };

  const triggerSwipe = (direction) => {
    if (isSwipingRef.current) return;
    isSwipingRef.current = true;

    const toX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

    Animated.timing(pan, {
      toValue: { x: toX, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      onSwipeComplete(direction);
    });
  };

  const onSwipeComplete = (direction) => {
    const currentCards = cardsRef.current;
    const currentIndex = indexRef.current;
    const currentCard = currentCards[currentIndex];
    const isMastered = direction === 'right';

    let nextStudyAgain = [...studyAgainCardsRef.current];
    let nextMasteredCount = masteredCountRef.current;

    if (isMastered) {
      nextMasteredCount += 1;
      masteredCountRef.current = nextMasteredCount;
      setMasteredCount(nextMasteredCount);
    } else if (currentCard) {
      nextStudyAgain.push(currentCard);
      studyAgainCardsRef.current = nextStudyAgain;
      setStudyAgainCards(nextStudyAgain);
    }

    pan.setValue({ x: 0, y: 0 });
    if (autoResetSideRef.current) {
      flipAnim.setValue(0);
      flippedRef.current = false;
      setFlipped(false);
    }

    // Check if this was the last card in the current active deck/round
    const isLastInRound = currentIndex + 1 >= currentCards.length;

    if (isLastInRound) {
      if (nextStudyAgain.length === 0) {
        // All cards completed and mastered!
        updateSession(totalCardsCountRef.current, true);
        setCompleted(true);
      } else {
        // Re-appear: Start next round with the cards marked for study again
        const nextRoundDeck = [...nextStudyAgain];
        cardsRef.current = nextRoundDeck;
        indexRef.current = 0;
        studyAgainCardsRef.current = [];
        roundRef.current = roundRef.current + 1;

        setCards(nextRoundDeck);
        setStudyAgainCards([]);
        setIndex(0);
        setRound(roundRef.current);
        updateSession(nextMasteredCount, false);
      }
    } else {
      const nextIndex = currentIndex + 1;
      indexRef.current = nextIndex;
      setIndex(nextIndex);
      updateSession(nextMasteredCount, false);
    }

    isSwipingRef.current = false;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        if (isSwipingRef.current) return;

        const { dx, dy, vx } = gestureState;

        // Tap detected if very little movement (tap to flip)
        if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
          flipCard();
          return;
        }

        // Swipe right -> Mastered
        if (dx > 100 || vx > 0.6) {
          triggerSwipe('right');
        }
        // Swipe left -> Study Again
        else if (dx < -100 || vx < -0.6) {
          triggerSwipe('left');
        }
        // Return to center (hover returned)
        else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            tension: 40,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const frontAnim = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backAnim  = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
    outputRange: ['-25deg', '0deg', '25deg'],
    extrapolate: 'clamp',
  });

  const animatedCardStyle = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      { rotate },
    ],
  };

  // Content opacity drops to 50% when dragging / hovering
  const contentOpacity = pan.x.interpolate({
    inputRange: [-120, 0, 120],
    outputRange: [0.5, 1, 0.5],
    extrapolate: 'clamp',
  });

  const studyAgainOpacity = pan.x.interpolate({
    inputRange: [-120, -20, 0],
    outputRange: [1, 0.35, 0],
    extrapolate: 'clamp',
  });

  const masteredOpacity = pan.x.interpolate({
    inputRange: [0, 20, 120],
    outputRange: [0, 0.35, 1],
    extrapolate: 'clamp',
  });

  // ------------------------------------------------------------
  // LOADING
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Loading flashcards…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // EMPTY / ERROR
  if (error || cards.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={26} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{deckTitle}</Text>
          <View style={styles.iconButton} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="card-outline" size={52} color="#9AA5B1" />
          <Text style={styles.emptyText}>{error ?? 'No flashcards available.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // COMPLETED STATE SCREEN
  if (completed) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={26} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{deckTitle}</Text>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.completedBody}>
          <View style={styles.successIconBadge}>
            <Ionicons name="checkmark-circle" size={54} color="#3CB878" />
          </View>
          <Text style={styles.completedTitle}>Deck Completed!</Text>
          <Text style={styles.completedSubtitle}>
            You have successfully mastered all {totalCardsCount || cards.length} cards in this deck.
          </Text>
        </View>

        <View style={styles.completedFooter}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={restartDeck}
          >
            <Text style={styles.primaryButtonText}>Practice Again</Text>
            <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
            <Text style={styles.secondaryButtonText}>Back to Library</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // MAIN
  const isFrontTerm = frontSide === 'term';
  const frontContent = isFrontTerm ? card?.term : card?.definition;
  const backContent = isFrontTerm ? card?.definition : card?.term;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{deckTitle}</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => setSettingsVisible(true)}>
          <Ionicons name="settings-outline" size={22} color={NAVY} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardArea}>
        {/* Top Meta info row */}
        <View style={styles.topMetaRow}>
          <View style={styles.metaLeftGroup}>
            <Text style={styles.metaSubjectText}>{subject || 'All Subjects'}</Text>
            {round > 1 && (
              <View style={styles.roundBadge}>
                <Text style={styles.roundBadgeText}>Round {round}</Text>
              </View>
            )}
          </View>
          <View style={styles.metaRightGroup}>
            <Text style={styles.metaProgressText}>
              {index + 1} / {cards.length}
            </Text>
            {totalCardsCount > 0 && (
              <Text style={styles.metaMasteredSub}>
                ({masteredCount}/{totalCardsCount} Mastered)
              </Text>
            )}
          </View>
        </View>

        {/* Card Stack Container */}
        <View style={styles.cardStackContainer}>
          {/* Card Underneath (Next Card Preview) */}
          {index + 1 < cards.length && (
            <View style={[styles.cardWrapper, styles.cardUnderneath]}>
              <View style={[styles.card, styles.cardFront]}>
                <Text style={styles.cardBadge}>{isFrontTerm ? 'TERM' : 'DEFINITION'}</Text>
                <View style={styles.cardContentWrapper}>
                  <Text
                    style={isFrontTerm ? styles.termTextFront : styles.definitionText}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {isFrontTerm ? cards[index + 1].term : cards[index + 1].definition}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Active Swipeable Card */}
          <Animated.View
            {...panResponder.panHandlers}
            style={[styles.cardWrapper, animatedCardStyle]}
          >
            {/* Front Card Face */}
            <Animated.View style={[styles.card, styles.cardFront, { transform: [{ rotateY: frontAnim }] }]}>
              <Animated.View style={[styles.cardInnerContent, { opacity: contentOpacity }]}>
                <Text style={styles.cardBadge}>{isFrontTerm ? 'TERM' : 'DEFINITION'}</Text>
                <View style={styles.cardContentWrapper}>
                  <Text
                    style={isFrontTerm ? styles.termTextFront : styles.definitionText}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {frontContent}
                  </Text>
                </View>
              </Animated.View>

              {/* Inside Overlay: Study Again (Red border + frosted dim + stamp) */}
              <Animated.View
                pointerEvents="none"
                style={[styles.cardOverlayInside, styles.studyAgainOverlayInside, { opacity: studyAgainOpacity }]}
              >
                <View style={[StyleSheet.absoluteFillObject, styles.frostedBackdropLight]} />
                <View style={styles.stampContainerLeft}>
                  <View style={styles.studyAgainStamp}>
                    <Ionicons name="refresh" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.studyAgainStampText}>STUDY AGAIN</Text>
                  </View>
                </View>
              </Animated.View>

              {/* Inside Overlay: Mastered (Green border + frosted dim + stamp) */}
              <Animated.View
                pointerEvents="none"
                style={[styles.cardOverlayInside, styles.masteredOverlayInside, { opacity: masteredOpacity }]}
              >
                <View style={[StyleSheet.absoluteFillObject, styles.frostedBackdropLight]} />
                <View style={styles.stampContainerRight}>
                  <View style={styles.masteredStamp}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={styles.masteredStampText}>MASTERED</Text>
                  </View>
                </View>
              </Animated.View>
            </Animated.View>

            {/* Back Card Face */}
            <Animated.View style={[styles.card, styles.cardBack, styles.cardAbsolute, { transform: [{ rotateY: backAnim }] }]}>
              <Animated.View style={[styles.cardInnerContent, { opacity: contentOpacity }]}>
                <Text style={styles.cardBadgeBack}>{isFrontTerm ? 'DEFINITION' : 'TERM'}</Text>
                <View style={styles.cardContentWrapper}>
                  <Text
                    style={isFrontTerm ? styles.definitionTextBack : styles.termText}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {backContent}
                  </Text>
                </View>
              </Animated.View>

              {/* Inside Overlay: Study Again (Red border + frosted dim + stamp) */}
              <Animated.View
                pointerEvents="none"
                style={[styles.cardOverlayInside, styles.studyAgainOverlayInside, { opacity: studyAgainOpacity }]}
              >
                <View style={[StyleSheet.absoluteFillObject, styles.frostedBackdropDark]} />
                <View style={styles.stampContainerLeft}>
                  <View style={styles.studyAgainStamp}>
                    <Ionicons name="refresh" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.studyAgainStampText}>STUDY AGAIN</Text>
                  </View>
                </View>
              </Animated.View>

              {/* Inside Overlay: Mastered (Green border + frosted dim + stamp) */}
              <Animated.View
                pointerEvents="none"
                style={[styles.cardOverlayInside, styles.masteredOverlayInside, { opacity: masteredOpacity }]}
              >
                <View style={[StyleSheet.absoluteFillObject, styles.frostedBackdropDark]} />
                <View style={styles.stampContainerRight}>
                  <View style={styles.masteredStamp}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={styles.masteredStampText}>MASTERED</Text>
                  </View>
                </View>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </View>

        <Text style={styles.hintText}>Tap card to flip</Text>
      </View>

      {/* Swipe Gesture Guide Bar (Replaces old arrow buttons) */}
      <View style={styles.gestureHintBar}>
        <View style={styles.gestureHintLeft}>
          <Ionicons name="arrow-back" size={14} color="#EF4444" />
          <Text style={styles.gestureHintTextLeft}>Swipe left to Study again</Text>
        </View>
        <View style={styles.gestureHintDivider} />
        <View style={styles.gestureHintRight}>
          <Text style={styles.gestureHintTextRight}>Swipe right for Mastered</Text>
          <Ionicons name="arrow-forward" size={14} color="#10B981" />
        </View>
      </View>

      {/* ── Settings Bottom Sheet Modal ── */}
      <Modal
        visible={settingsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSettingsVisible(false)}
        />
        <View style={styles.settingsSheet}>
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="settings-outline" size={20} color={NAVY} />
              <Text style={styles.sheetTitle}>Flashcard Settings</Text>
            </View>
            <TouchableOpacity onPress={() => setSettingsVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={NAVY} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Setting 1: Card Orientation */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingGroupTitle}>CARD FRONT SIDE</Text>
              <Text style={styles.settingGroupSub}>Choose whether to see the definition or term first</Text>
              
              <View style={styles.segmentRow}>
                <TouchableOpacity
                  style={[styles.segmentBtn, frontSide === 'definition' && styles.segmentBtnActive]}
                  onPress={() => {
                    setFrontSide('definition');
                    saveSettings({ frontSide: 'definition' });
                  }}
                >
                  <Ionicons name="document-text-outline" size={16} color={frontSide === 'definition' ? '#fff' : NAVY} />
                  <Text style={[styles.segmentBtnText, frontSide === 'definition' && styles.segmentBtnTextActive]}>
                    Definition First
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, frontSide === 'term' && styles.segmentBtnActive]}
                  onPress={() => {
                    setFrontSide('term');
                    saveSettings({ frontSide: 'term' });
                  }}
                >
                  <Ionicons name="text-outline" size={16} color={frontSide === 'term' ? '#fff' : NAVY} />
                  <Text style={[styles.segmentBtnText, frontSide === 'term' && styles.segmentBtnTextActive]}>
                    Term First
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Setting 2: Shuffle Order */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.settingLabel}>Shuffle Cards</Text>
                <Text style={styles.settingSub}>Randomize flashcard presentation order</Text>
              </View>
              <Switch
                value={isShuffle}
                onValueChange={(val) => {
                  setIsShuffle(val);
                  saveSettings({ isShuffle: val });
                  applyDeckOrder(val);
                }}
                trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
                thumbColor="#fff"
              />
            </View>

            {/* Setting 3: Auto-Reset Side */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.settingLabel}>Auto-Flip to Front</Text>
                <Text style={styles.settingSub}>Always reset to front side when moving to next card</Text>
              </View>
              <Switch
                value={autoResetSide}
                onValueChange={(val) => {
                  setAutoResetSide(val);
                  saveSettings({ autoResetSide: val });
                }}
                trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
                thumbColor="#fff"
              />
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionBox}>
              <TouchableOpacity
                style={styles.restartDeckBtn}
                onPress={() => {
                  restartDeck();
                  setSettingsVisible(false);
                }}
              >
                <Ionicons name="refresh" size={16} color={NAVY} />
                <Text style={styles.restartDeckText}>Restart & Reshuffle Deck</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => setSettingsVisible(false)}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: '#FFFFFF' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
  iconButton:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: NAVY },
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  loadingText:   { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600' },
  emptyText:     { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600', textAlign: 'center' },
  retryBtn:      { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 20 },
  retryText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  cardArea:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  cardStackContainer: { width: CARD_WIDTH, height: CARD_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  cardWrapper:   { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  cardUnderneath:{ position: 'absolute', top: 0, left: 0, transform: [{ scale: 0.95 }, { translateY: 10 }], opacity: 0.55, zIndex: 0 },
  card:          { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24, backfaceVisibility: 'hidden', overflow: 'hidden' },
  cardAbsolute:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  cardContentWrapper: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  cardInnerContent: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  cardFront:     { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D7DEE8' },
  cardBack:      { backgroundColor: NAVY, borderWidth: 1.5, borderColor: NAVY },
  definitionText:{ fontSize: 19, lineHeight: 28, fontWeight: '600', color: NAVY, textAlign: 'center' },
  termText:      { fontSize: 24, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  hintText:      { marginTop: 18, fontSize: 13, color: '#9AA5B1' },

  // Inside-card Tinder-style Swipe Feedback Overlays
  cardOverlayInside: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    overflow: 'hidden',
    zIndex: 10,
  },
  studyAgainOverlayInside: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderWidth: 3.5,
    borderColor: '#EF4444',
  },
  masteredOverlayInside: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 3.5,
    borderColor: '#10B981',
  },

  // Tinder-style Stamps
  stampContainerLeft: {
    position: 'absolute',
    top: 20,
    right: 18,
    transform: [{ rotate: '12deg' }],
  },
  studyAgainStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#EF4444',
    backgroundColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  studyAgainStampText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 1,
  },

  stampContainerRight: {
    position: 'absolute',
    top: 20,
    left: 18,
    transform: [{ rotate: '-12deg' }],
  },
  masteredStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#10B981',
    backgroundColor: '#FFFFFF',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  masteredStampText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 1,
  },
  frostedBackdropLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  frostedBackdropDark: {
    backgroundColor: 'rgba(11, 37, 64, 0.78)',
  },

  // Gesture Hint Bar
  gestureHintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 14,
  },
  gestureHintLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gestureHintRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gestureHintTextLeft: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  gestureHintTextRight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  gestureHintDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#CBD5E1',
  },

  topMetaRow:    { width: CARD_WIDTH, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  metaLeftGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaRightGroup:{ flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  metaSubjectText: { fontSize: 13, fontWeight: '700', color: NAVY, textTransform: 'uppercase', letterSpacing: 0.5 },
  roundBadge:    { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B' },
  roundBadgeText:{ fontSize: 11, fontWeight: '700', color: '#B45309' },
  metaProgressText: { fontSize: 13, fontWeight: '700', color: NAVY },
  metaMasteredSub: { fontSize: 11, fontWeight: '600', color: '#10B981' },
  completedBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  successIconBadge: {
    backgroundColor: '#EAFBF2',
    padding: 12,
    borderRadius: 40,
    marginBottom: 20,
  },
  completedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 8,
  },
  completedSubtitle: {
    fontSize: 14,
    color: '#6B7684',
    textAlign: 'center',
    lineHeight: 20,
  },
  completedFooter: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: NAVY,
    borderRadius: 24,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#D7DEE8',
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: NAVY,
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Settings Modal Styles ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 37, 64, 0.45)',
  },
  settingsSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: NAVY,
  },
  closeBtn: {
    padding: 4,
  },
  settingGroup: {
    marginBottom: 18,
  },
  settingGroupTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  settingGroupSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  segmentBtnActive: {
    borderColor: NAVY,
    backgroundColor: NAVY,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY,
  },
  segmentBtnTextActive: {
    color: '#fff',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
  },
  settingSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  quickActionBox: {
    marginTop: 18,
    marginBottom: 14,
  },
  restartDeckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  restartDeckText: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
  },
  doneBtn: {
    backgroundColor: NAVY,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cardBadge: {
    position: 'absolute',
    top: 14,
    left: 18,
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  cardBadgeBack: {
    position: 'absolute',
    top: 14,
    left: 18,
    fontSize: 10,
    fontWeight: '800',
    color: '#cbd5e1',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  termTextFront: {
    fontSize: 24,
    fontWeight: '700',
    color: NAVY,
    textAlign: 'center',
  },
  definitionTextBack: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
  },
});
