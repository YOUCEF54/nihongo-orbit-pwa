/* ============================================================
   FSRS 4.5 wrapper — maps the app's 4 Arabic grades onto the
   ts-fsrs scheduler, and converts between scheduler Cards and
   the persisted UserMasteryState schema.
   ============================================================ */
import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from "ts-fsrs";
import type { ReviewGrade } from "./gamification";
import type { CardState, UserMasteryState } from "@/types/learning";

export type { Card } from "ts-fsrs";

const STATE_TO_CARD_STATE: Record<State, CardState> = {
  [State.New]: "New",
  [State.Learning]: "Learning",
  [State.Review]: "Review",
  [State.Relearning]: "Relearning",
};

const CARD_STATE_TO_STATE: Record<CardState, State> = {
  New: State.New,
  Learning: State.Learning,
  Review: State.Review,
  Relearning: State.Relearning,
};

const CARD_STATE_AR: Record<CardState, string> = {
  New: "جديدة",
  Learning: "قيد التعلّم",
  Review: "مراجعة",
  Relearning: "مراجعة مستعادة",
};

export function gradeToRating(grade: ReviewGrade): Grade {
  switch (grade) {
    case 0:
      return Rating.Again;
    case 1:
      return Rating.Hard;
    case 2:
      return Rating.Good;
    case 3:
      return Rating.Easy;
  }
}

export function createFsrsCard(now: Date = new Date()): Card {
  return createEmptyCard(now);
}

export function scheduleFsrs(card: Card, grade: ReviewGrade, now: Date = new Date()): Card {
  return fsrs().next(card, now, gradeToRating(grade)).card;
}

export function dueInDays(card: Card, now: Date = new Date()): number {
  return Math.max(0, Math.round((card.due.getTime() - now.getTime()) / 86_400_000));
}

export function cardStateOf(card: Card): CardState {
  return STATE_TO_CARD_STATE[card.state];
}

export function cardStateLabel(state: CardState): string {
  return CARD_STATE_AR[state];
}

export function cardToMastery(
  userId: string,
  cardId: string,
  cardType: UserMasteryState["cardType"],
  card: Card,
): UserMasteryState {
  return {
    userId,
    cardId,
    cardType,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: cardStateOf(card),
    lastReview: card.last_review ? card.last_review.toISOString() : new Date().toISOString(),
  };
}

export function masteryToCard(mastery: UserMasteryState): Card {
  return {
    due: new Date(mastery.lastReview),
    stability: mastery.stability,
    difficulty: mastery.difficulty,
    elapsed_days: mastery.elapsedDays,
    scheduled_days: mastery.scheduledDays,
    reps: mastery.reps,
    lapses: mastery.lapses,
    learning_steps: 0,
    state: CARD_STATE_TO_STATE[mastery.state],
    last_review: new Date(mastery.lastReview),
  };
}