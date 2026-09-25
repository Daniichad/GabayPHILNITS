import {
  calculateStreakPoints,
  calculateReadingPoints,
  calculatePracticePoints,
  calculateMockExamPoints
} from '../utils/pointsEngine'

describe('Points Engine', () => {
  describe('calculateStreakPoints', () => {
    it('awards correct points for early streak (day 1-2)', () => {
      expect(calculateStreakPoints(1).points).toBe(5)
      expect(calculateStreakPoints(2).points).toBe(5)
    })
    
    it('awards correct points for mid streak (day 3-6)', () => {
      expect(calculateStreakPoints(4).points).toBe(10)
    })

    it('awards correct points for day 30 with bonus', () => {
      // Base (30) + Bonus (100)
      expect(calculateStreakPoints(30).points).toBe(130)
    })

    it('awards correct points for day 100 with bonus', () => {
      // Base (30) + Bonus (250)
      expect(calculateStreakPoints(100).points).toBe(280)
    })
  })

  describe('calculateReadingPoints', () => {
    it('awards 5 points for starting', () => {
      const res = calculateReadingPoints({ isStart: true })
      expect(res.points).toBe(5)
    })

    it('awards 15 points for finishing first time with engagement', () => {
      const res = calculateReadingPoints({
        isStart: false,
        isFirstTime: true,
        sessionData: { dwellTimeSeconds: 20, scrolledToBottom: true }
      })
      expect(res.points).toBe(15)
    })

    it('awards 0 points if engagement threshold not met', () => {
      const res = calculateReadingPoints({
        isStart: false,
        isFirstTime: true,
        sessionData: { dwellTimeSeconds: 5, scrolledToBottom: false }
      })
      expect(res.points).toBe(0)
    })
  })

  describe('calculatePracticePoints', () => {
    it('awards 5 points on start', () => {
      expect(calculatePracticePoints({ isStart: true }).points).toBe(5)
    })

    it('awards 0 points if daily cap reached', () => {
      expect(calculatePracticePoints({ isStart: false, sessionsToday: 3 }).points).toBe(0)
    })

    it('applies 0.5x multiplier for <50% accuracy', () => {
      // 1 correct out of 3 = 33% accuracy
      // Base gestures: 1 * 2 = 2
      // Multiplier: 0.5 -> gesture points = 1
      // Finish points: 10
      // Total: 11
      const res = calculatePracticePoints({
        isStart: false,
        correctGestures: 1,
        totalGestures: 3
      })
      expect(res.points).toBe(11)
    })

    it('applies 1.5x multiplier for >=90% accuracy', () => {
      // 9 correct out of 10 = 90% accuracy
      // Base gestures: 9 * 2 = 18
      // Multiplier: 1.5 -> gesture points = 27
      // Finish points: 10
      // Total: 37
      const res = calculatePracticePoints({
        isStart: false,
        correctGestures: 9,
        totalGestures: 10
      })
      expect(res.points).toBe(37)
    })
  })

  describe('calculateMockExamPoints', () => {
    it('awards all bonuses for a perfect first attempt', () => {
      // Completion (20) + Score (100*3=300) + Passing (50) + Perfect (150) + First (30) = 550
      const res = calculateMockExamPoints({
        examId: 'exam1',
        score: 100,
        isFirstAttempt: true
      })
      expect(res.points).toBe(550)
    })

    it('awards base and improvement bonus on retake', () => {
      // Previous best: 70
      // New score: 80
      // Completion (20) + Score (80*3=240) = 260
      // Improvement: 10 * 5 = 50
      // Total: 310
      const res = calculateMockExamPoints({
        examId: 'exam1',
        score: 80,
        isFirstAttempt: false,
        previousBestScore: 70
      })
      expect(res.points).toBe(310)
    })

    it('does not award improvement bonus if score is lower', () => {
      // Previous best: 90
      // New score: 80
      // Completion (20) + Score (80*3=240) = 260
      // Total: 260
      const res = calculateMockExamPoints({
        examId: 'exam1',
        score: 80,
        isFirstAttempt: false,
        previousBestScore: 90
      })
      expect(res.points).toBe(260)
    })
  })
})
