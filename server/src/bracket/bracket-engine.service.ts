import { Injectable, BadRequestException } from '@nestjs/common';
import { Bracket, BracketRound, BracketMatchSlot, BracketParticipant } from './bracket.entity';

interface Participant {
  id: string;
  name: string;
  seed?: number;
}

@Injectable()
export class BracketEngine {
  /**
   * Generate single elimination bracket
   * Supports 2^n participants, with auto bye for odd counts
   */
  generateSingleElimination(participants: Participant[]): BracketRound[] {
    if (participants.length < 2) {
      throw new BadRequestException('至少需要 2 名参赛者');
    }

    const totalSlots = this.nextPowerOfTwo(participants.length);
    const rounds: BracketRound[] = [];
    const roundCount = Math.log2(totalSlots);

    // Sort participants by seed if available
    const sorted = this.sortBySeed(participants);
    const slots: BracketParticipant[] = this.fillSlots(sorted, totalSlots);

    // Generate first round
    const firstRound: BracketMatchSlot[] = [];
    for (let i = 0; i < totalSlots / 2; i++) {
      firstRound.push({
        id: `r1-m${i + 1}`,
        position: i,
        participant_a: slots[i * 2],
        participant_b: slots[i * 2 + 1],
        winner_to: roundCount > 1 ? { round: 1, match: Math.floor(i / 2), position: i % 2 === 0 ? 'a' : 'b' } : undefined,
      });
    }
    rounds.push({ name: '第一轮', matches: firstRound });

    // Generate subsequent rounds
    for (let r = 1; r < roundCount; r++) {
      const matchCount = totalSlots / Math.pow(2, r + 1);
      const matches: BracketMatchSlot[] = [];
      for (let i = 0; i < matchCount; i++) {
        matches.push({
          id: `r${r + 1}-m${i + 1}`,
          position: i,
          winner_to: r < roundCount - 1
            ? { round: r + 1, match: Math.floor(i / 2), position: i % 2 === 0 ? 'a' : 'b' }
            : undefined,
        });
      }
      rounds.push({ name: this.getRoundName(r + 1, roundCount), matches });
    }

    return rounds;
  }

  /**
   * Generate double elimination bracket
   */
  generateDoubleElimination(participants: Participant[]): { winnersBracket: BracketRound[]; losersBracket: BracketRound[] } {
    if (participants.length < 4) {
      throw new BadRequestException('双败淘汰至少需要 4 名参赛者');
    }
    if (participants.length % 2 !== 0) {
      throw new BadRequestException('双败淘汰参赛者数量必须为偶数');
    }

    const totalSlots = this.nextPowerOfTwo(participants.length);
    const sorted = this.sortBySeed(participants);
    const slots: BracketParticipant[] = this.fillSlots(sorted, totalSlots);

    const winnersBracket: BracketRound[] = [];
    const losersBracket: BracketRound[] = [];
    const roundCount = Math.log2(totalSlots);

    // Winners bracket - first round
    const wFirstRound: BracketMatchSlot[] = [];
    for (let i = 0; i < totalSlots / 2; i++) {
      wFirstRound.push({
        id: `wr1-m${i + 1}`,
        position: i,
        participant_a: slots[i * 2],
        participant_b: slots[i * 2 + 1],
        winner_to: roundCount > 1 ? { round: 1, match: Math.floor(i / 2), position: i % 2 === 0 ? 'a' : 'b' } : undefined,
        loser_to: { round: 0, match: Math.floor(i / 2), position: i % 2 === 0 ? 'a' : 'b' },
      });
    }
    winnersBracket.push({ name: '胜者组第一轮', matches: wFirstRound });

    // Winners bracket - subsequent rounds
    for (let r = 1; r < roundCount; r++) {
      const matchCount = totalSlots / Math.pow(2, r + 1);
      const matches: BracketMatchSlot[] = [];
      for (let i = 0; i < matchCount; i++) {
        matches.push({
          id: `wr${r + 1}-m${i + 1}`,
          position: i,
          winner_to: r < roundCount - 1
            ? { round: r + 1, match: Math.floor(i / 2), position: i % 2 === 0 ? 'a' : 'b' }
            : undefined,
          loser_to: { round: r * 2 - 1, match: i, position: 'a' },
        });
      }
      winnersBracket.push({ name: `胜者组${this.getRoundName(r + 1, roundCount)}`, matches });
    }

    // Losers bracket
    for (let lr = 0; lr < roundCount * 2 - 1; lr++) {
      const matchCount = Math.ceil(totalSlots / Math.pow(2, Math.floor(lr / 2) + 2));
      const matches: BracketMatchSlot[] = [];
      for (let i = 0; i < matchCount; i++) {
        matches.push({
          id: `lr${lr + 1}-m${i + 1}`,
          position: i,
          winner_to: lr < roundCount * 2 - 2
            ? { round: lr + 1, match: Math.floor(i / 2), position: i % 2 === 0 ? 'a' : 'b' }
            : { round: -1, match: 0, position: 'a' }, // Grand final
        });
      }
      losersBracket.push({ name: `败者组第${lr + 1}轮`, matches });
    }

    return { winnersBracket, losersBracket };
  }

  /**
   * Generate round-robin schedule
   */
  generateRoundRobin(participants: Participant[], doubleRound: boolean = false): BracketRound[] {
    if (participants.length < 3) {
      throw new BadRequestException('循环赛至少需要 3 名参赛者');
    }

    const n = participants.length;
    const rounds: BracketRound[] = [];
    const totalRounds = doubleRound ? (n - 1) * 2 : n - 1;
    const participantsList = [...participants];

    // If odd number, add a dummy "bye"
    if (n % 2 !== 0) {
      participantsList.push({ id: 'bye', name: '轮空', seed: undefined });
    }

    const m = participantsList.length;
    const half = m / 2;

    for (let round = 0; round < totalRounds; round++) {
      const matches: BracketMatchSlot[] = [];
      const actualRound = round % (m - 1);

      for (let i = 0; i < half; i++) {
        const home = participantsList[i];
        const away = participantsList[m - 1 - i];

        // Skip bye matches
        if (home.id === 'bye' || away.id === 'bye') continue;

        matches.push({
          id: `rr${round + 1}-m${i + 1}`,
          position: i,
          participant_a: { id: home.id, name: home.name },
          participant_b: { id: away.id, name: away.name },
        });
      }

      rounds.push({
        name: doubleRound
          ? (round < (m - 1) ? `第一循环 第${actualRound + 1}轮` : `第二循环 第${actualRound + 1}轮`)
          : `第${round + 1}轮`,
        matches,
      });

      // Rotate participants for next round (circle method)
      const last = participantsList.pop()!;
      participantsList.splice(1, 0, last);
    }

    return rounds;
  }

  /**
   * Calculate rankings for round-robin tournament
   */
  calculateRoundRobinRankings(
    participants: Participant[],
    matchResults: { participantAId: string; participantBId: string; scoreA: number; scoreB: number }[],
    scoring: { win: number; draw: number; loss: number } = { win: 3, draw: 1, loss: 0 },
  ): { participantId: string; participantName: string; rank: number; score: number; wins: number; losses: number; draws: number; scoreFor: number; scoreAgainst: number }[] {
    const stats = new Map<string, { wins: number; losses: number; draws: number; scoreFor: number; scoreAgainst: number }>();

    participants.forEach(p => {
      stats.set(p.id, { wins: 0, losses: 0, draws: 0, scoreFor: 0, scoreAgainst: 0 });
    });

    matchResults.forEach(match => {
      const a = stats.get(match.participantAId)!;
      const b = stats.get(match.participantBId)!;

      a.scoreFor += match.scoreA;
      a.scoreAgainst += match.scoreB;
      b.scoreFor += match.scoreB;
      b.scoreAgainst += match.scoreA;

      if (match.scoreA > match.scoreB) {
        a.wins++;
        b.losses++;
      } else if (match.scoreA < match.scoreB) {
        b.wins++;
        a.losses++;
      } else {
        a.draws++;
        b.draws++;
      }
    });

    const rankings = Array.from(stats.entries())
      .map(([participantId, s]) => {
        const participant = participants.find(p => p.id === participantId);
        return {
          participantId,
          participantName: participant?.name || 'Unknown',
          rank: 0,
          score: s.wins * scoring.win + s.draws * scoring.draw + s.losses * scoring.loss,
          wins: s.wins,
          losses: s.losses,
          draws: s.draws,
          scoreFor: s.scoreFor,
          scoreAgainst: s.scoreAgainst,
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const diffA = a.scoreFor - a.scoreAgainst;
        const diffB = b.scoreFor - b.scoreAgainst;
        if (diffB !== diffA) return diffB - diffA;
        return b.scoreFor - a.scoreFor;
      });

    // Assign ranks
    rankings.forEach((r, i) => { r.rank = i + 1; });
    return rankings;
  }

  /**
   * Calculate elimination tournament rankings based on bracket results
   */
  calculateEliminationRankings(
    bracket: Bracket,
    matchResults: Map<string, { winnerId: string }>,
  ): { participantId: string; participantName: string; rank: number }[] {
    const rankings: { participantId: string; participantName: string; rank: number }[] = [];

    // Get all participants from first round
    const firstRound = bracket.rounds_data[0];
    const allParticipants = new Set<string>();
    const participantNames = new Map<string, string>();

    firstRound.matches.forEach(m => {
      if (m.participant_a && !m.participant_a.is_bye) {
        allParticipants.add(m.participant_a.id);
        participantNames.set(m.participant_a.id, m.participant_a.name);
      }
      if (m.participant_b && !m.participant_b.is_bye) {
        allParticipants.add(m.participant_b.id);
        participantNames.set(m.participant_b.id, m.participant_b.name);
      }
    });

    // Track eliminated round
    const eliminated = new Map<string, number>();
    const totalRounds = bracket.rounds_data.length;

    bracket.rounds_data.forEach((round, roundIdx) => {
      round.matches.forEach(match => {
        if (matchResults.has(match.id)) {
          const result = matchResults.get(match.id)!;
          // Find loser
          const loserId = match.participant_a?.id === result.winnerId
            ? match.participant_b?.id
            : match.participant_a?.id;
          if (loserId && !eliminated.has(loserId)) {
            eliminated.set(loserId, roundIdx + 1);
          }
        }
      });
    });

    // Find champion (last round winner)
    const finalRound = bracket.rounds_data[totalRounds - 1];
    const finalMatch = finalRound.matches[0];
    let championId: string | undefined;
    if (finalMatch && matchResults.has(finalMatch.id)) {
      championId = matchResults.get(finalMatch.id)!.winnerId;
    }

    // Build rankings
    const participants = Array.from(allParticipants).map(id => ({
      id,
      name: participantNames.get(id) || 'Unknown',
      eliminatedRound: eliminated.get(id) || totalRounds,
    }));

    // Sort: champion first, then by elimination round (later = higher rank)
    participants.sort((a, b) => {
      if (a.id === championId) return -1;
      if (b.id === championId) return 1;
      return b.eliminatedRound - a.eliminatedRound;
    });

    participants.forEach((p, i) => {
      rankings.push({ participantId: p.id, participantName: p.name, rank: i + 1 });
    });

    return rankings;
  }

  private nextPowerOfTwo(n: number): number {
    let power = 1;
    while (power < n) power *= 2;
    return power;
  }

  private sortBySeed(participants: Participant[]): Participant[] {
    const withSeed = participants.filter(p => p.seed !== undefined).sort((a, b) => a.seed! - b.seed!);
    const withoutSeed = participants.filter(p => p.seed === undefined);
    // Shuffle unseeded
    const shuffled = withoutSeed.sort(() => Math.random() - 0.5);
    return [...withSeed, ...shuffled];
  }

  private fillSlots(sorted: Participant[], totalSlots: number): BracketParticipant[] {
    const slots: BracketParticipant[] = [];

    if (sorted.length === totalSlots) {
      // Perfect fit, use standard seeding pattern
      const seeded = this.applySeedingPattern(sorted);
      seeded.forEach(p => slots.push({
        id: p.id,
        name: p.name,
        seed: p.seed,
        is_bye: p.id === 'bye',
      }));
    } else {
      // Need byes - distribute evenly
      const byeCount = totalSlots - sorted.length;
      const byePositions = this.calculateByePositions(totalSlots, byeCount);
      let participantIdx = 0;
      for (let i = 0; i < totalSlots; i++) {
        if (byePositions.includes(i)) {
          slots.push({ id: `bye_${i}`, name: '轮空', is_bye: true });
        } else {
          const p = sorted[participantIdx++];
          slots.push({ id: p.id, name: p.name, seed: p.seed });
        }
      }
    }
    return slots;
  }

  private applySeedingPattern(participants: Participant[]): Participant[] {
    const n = participants.length;
    const result: Participant[] = new Array(n);
    const order = this.seedingOrder(n);
    for (let i = 0; i < n; i++) {
      result[order[i] - 1] = participants[i];
    }
    return result;
  }

  private seedingOrder(n: number): number[] {
    // Generate standard bracket seeding order: 1,8,4,5,3,6,2,7 for 8 participants
    const result: number[] = [];
    const queue: number[] = [1];
    while (queue.length > 0) {
      const pos = queue.shift()!;
      if (pos <= n) {
        result.push(pos);
        queue.push(pos * 2);
        queue.push(pos * 2 + 1);
      }
    }
    return result;
  }

  private calculateByePositions(totalSlots: number, byeCount: number): number[] {
    // Byes go to top seeds
    return Array.from({ length: byeCount }, (_, i) => i);
  }

  private getRoundName(round: number, totalRounds: number): string {
    if (round === totalRounds) return '决赛';
    if (round === totalRounds - 1) return '半决赛';
    if (round === totalRounds - 2) return '四分之一决赛';
    return `第${round}轮`;
  }
}
