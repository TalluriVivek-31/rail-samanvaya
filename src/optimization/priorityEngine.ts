// Explainable Priority Scoring Engine
// Indian Railways · Multi-Criteria Decision Analysis (MCDA)
// Formula: 0.35 * Criticality + 0.25 * Urgency + 0.20 * Risk + 0.10 * Traffic + 0.10 * Resources

import { PriorityBreakdown } from '../types/samnvay';

/**
 * Explainable Priority Scoring Engine (Section 24 of specification)
 * 5-Factor Multi-Criteria Decision Analysis (MCDA):
 * Criticality 35% + Urgency 25% + Risk 20% + Traffic 10% + Resources 10%
 */
export function calculatePriorityScore(params: {
  criticality: number;      // 0-100
  urgency: number;          // 0-100
  risk: number;             // 0-100
  trafficImpact: number;    // 0-100
  resourceAvailability: number; // 0-100
  isContinuation?: boolean;
  hasActiveRestriction?: boolean;
  isOverdue?: boolean;
}): PriorityBreakdown {
  let { criticality, urgency, risk, trafficImpact, resourceAvailability } = params;
  const factors: string[] = [];

  if (params.isContinuation) {
    urgency = Math.min(100, urgency + 15);
    factors.push('Continuation work (+15 Urgency)');
  }

  if (params.hasActiveRestriction) {
    risk = Math.min(100, risk + 10);
    factors.push('Active Speed Restriction (+10 Risk)');
  }

  if (params.isOverdue) {
    urgency = Math.min(100, urgency + 10);
    factors.push('Overdue Completion Report (+10 Urgency)');
  }

  const score = Math.round(
    0.35 * criticality +
    0.25 * urgency +
    0.20 * risk +
    0.10 * trafficImpact +
    0.10 * resourceAvailability
  );

  const explanation = factors.length > 0
    ? `Explainable Priority Model: Base scores adjusted for ${factors.join(', ')}.`
    : 'Explainable Priority Model: Standard 5-factor weighted MCDA calculation (35% Crit, 25% Urg, 20% Risk, 10% Traf, 10% Res).';

  return {
    criticality,
    urgency,
    risk,
    trafficImpact,
    resourceAvailability,
    score,
    explanation,
    factors
  };
}
