import { View, Text, ScrollView } from '@tarojs/components'
import { useMemo } from 'react'
import './index.scss'

// ====== 类型定义（与后端 bracket.entity.ts 对应）======
interface Participant {
  id: string
  name: string
  seed?: number
  is_bye?: boolean
}

interface MatchSlot {
  id: string
  position: number
  participant_a?: Participant
  participant_b?: Participant
  winner_to?: { round: number; match: number; position: 'a' | 'b' }
  loser_to?: { round: number; match: number; position: 'a' | 'b' }
}

interface BracketRound {
  name: string
  matches: MatchSlot[]
}

export interface MatchResult {
  id: string
  round: number
  position: number
  score_a?: number
  score_b?: number
  winner_id?: string
  status: string
  participant_a_id?: string
  participant_b_id?: string
  scheduled_at?: string
}

interface BracketTreeProps {
  rounds_data: BracketRound[]
  type: string
  matches?: MatchResult[]
  onMatchClick?: (slot: MatchSlot, result: MatchResult | null) => void
}

export default function BracketTree({
  rounds_data,
  type,
  matches = [],
  onMatchClick,
}: BracketTreeProps) {
  // 构建 match 查找表：key = "round-position"
  const matchMap = useMemo(() => {
    const map = new Map<string, MatchResult>()
    matches.forEach((m) => {
      map.set(`${m.round}-${m.position}`, m)
    })
    return map
  }, [matches])

  if (!rounds_data || rounds_data.length === 0) {
    return (
      <View className="bracket-empty">
        <Text className="bracket-empty-text">暂无对阵数据</Text>
      </View>
    )
  }

  // 循环赛：按轮次分组渲染
  if (type === 'round_robin') {
    return <RoundRobinView rounds={rounds_data} matchMap={matchMap} onMatchClick={onMatchClick} />
  }

  // 双淘汰：分胜者组/败者组
  if (type === 'double_elimination') {
    const midPoint = Math.ceil(rounds_data.length / 2)
    const winnerRounds = rounds_data.slice(0, midPoint)
    const loserRounds = rounds_data.slice(midPoint)
    return (
      <View className="bracket-double">
        <Text className="bracket-section-title">胜者组</Text>
        <EliminationView
          rounds={winnerRounds}
          matchMap={matchMap}
          startRound={0}
          onMatchClick={onMatchClick}
        />
        {loserRounds.length > 0 && (
          <>
            <Text className="bracket-section-title">败者组</Text>
            <EliminationView
              rounds={loserRounds}
              matchMap={matchMap}
              startRound={midPoint}
              onMatchClick={onMatchClick}
            />
          </>
        )}
      </View>
    )
  }

  // 单淘汰：横向滚动
  return (
    <EliminationView
      rounds={rounds_data}
      matchMap={matchMap}
      startRound={0}
      onMatchClick={onMatchClick}
    />
  )
}

// ====== 单淘汰/双淘汰渲染 ======
function EliminationView({ rounds, matchMap, startRound, onMatchClick }) {
  return (
    <ScrollView scrollX className="bracket-scroll" enhanced showScrollbar={false}>
      <View className="bracket-container">
        {rounds.map((round, roundIdx) => {
          const actualRound = startRound + roundIdx
          return (
            <View key={roundIdx} className="bracket-round">
              <Text className="round-name">{round.name}</Text>
              <View className="round-matches">
                {round.matches.map((match: MatchSlot, matchIdx: number) => {
                  const result = matchMap.get(`${actualRound}-${match.position}`) || null
                  return (
                    <MatchCard
                      key={match.id || matchIdx}
                      slot={match}
                      result={result}
                      onClick={() => onMatchClick?.(match, result)}
                    />
                  )
                })}
              </View>
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

// ====== 对阵卡片 ======
function MatchCard({ slot, result, onClick }) {
  const a = slot.participant_a
  const b = slot.participant_b
  const isLive = result?.status === 'live'
  const isCompleted = result?.status === 'completed'
  const aWin = isCompleted && result?.winner_id === a?.id
  const bWin = isCompleted && result?.winner_id === b?.id
  const isBye = a?.is_bye || b?.is_bye

  return (
    <View
      className={`match-card ${isLive ? 'live' : ''} ${isBye ? 'bye' : ''}`}
      onClick={onClick}
    >
      {isLive && <View className="live-badge">LIVE</View>}
      {/* 选手A */}
      <View className={`match-slot ${aWin ? 'win' : ''} ${isCompleted && !aWin ? 'lose' : ''}`}>
        <Text className="slot-seed">{a?.seed || ''}</Text>
        <Text className="slot-name">{a?.name || '待定'}</Text>
        <Text className="slot-score">{isCompleted ? result?.score_a ?? '-' : ''}</Text>
      </View>
      <View className="match-divider" />
      {/* 选手B */}
      <View className={`match-slot ${bWin ? 'win' : ''} ${isCompleted && !bWin ? 'lose' : ''}`}>
        <Text className="slot-seed">{b?.seed || ''}</Text>
        <Text className="slot-name">{b?.name || '待定'}</Text>
        <Text className="slot-score">{isCompleted ? result?.score_b ?? '-' : ''}</Text>
      </View>
    </View>
  )
}

// ====== 循环赛渲染 ======
function RoundRobinView({ rounds, matchMap, onMatchClick }) {
  return (
    <View className="round-robin">
      {rounds.map((round: BracketRound, roundIdx: number) => (
        <View key={roundIdx} className="rr-round">
          <Text className="rr-round-name">{round.name}</Text>
          {round.matches.map((match: MatchSlot, matchIdx: number) => {
            const result = matchMap.get(`${roundIdx}-${match.position}`) || null
            const isCompleted = result?.status === 'completed'
            return (
              <View
                key={match.id || matchIdx}
                className={`rr-match ${isCompleted ? 'completed' : ''}`}
                onClick={() => onMatchClick?.(match, result)}
              >
                <View className="rr-side">
                  <Text className={`rr-name ${isCompleted && result?.winner_id === match.participant_a?.id ? 'win' : ''}`}>
                    {match.participant_a?.name || '待定'}
                  </Text>
                  <Text className="rr-score">{isCompleted ? result?.score_a ?? '-' : ''}</Text>
                </View>
                <Text className="rr-vs">VS</Text>
                <View className="rr-side rr-side-right">
                  <Text className="rr-score">{isCompleted ? result?.score_b ?? '-' : ''}</Text>
                  <Text className={`rr-name ${isCompleted && result?.winner_id === match.participant_b?.id ? 'win' : ''}`}>
                    {match.participant_b?.name || '待定'}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}
