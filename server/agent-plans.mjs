import { createHash } from 'node:crypto';

export function planSignature(agent, connectors, provider, skills) {
  const value = { objective: agent.objective, provider, connectors, skills: skills.map(({ id, version, instructions }) => ({ id, version, instructions })),
    policy: agent.policy, useKnowledgeBase: agent.useKnowledgeBase, maxSteps: agent.maxSteps, delivery: agent.delivery,
    incremental: agent.incremental, resultMode: agent.resultMode, clarifications: agent.clarifications || [] };
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function planQuestions(value) {
  if (!Array.isArray(value?.questions) || !value.questions.length) return [];
  return value.questions.slice(0, 5).map((question, index) => ({ id: `question-${index + 1}`, question: String(typeof question === 'string' ? question : question.question || '').trim().slice(0, 500) })).filter(item => item.question);
}
