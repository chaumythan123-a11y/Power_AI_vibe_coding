export const SCHEMA_VERSION = 1;
const string = { type: 'string' };
const stringList = { type: 'array', items: string };
const suggestion = { type: 'object', properties: { label: string, action: { type: 'string', enum: ['ask', 'book'] } }, required: ['label', 'action'] };
const day = { type: 'object', properties: { day: { type: 'integer' }, objective: string, tasks: stringList, exercise: string,
  segments: { type: 'array', items: { type: 'object', properties: { label: string, minutes: { type: 'integer' } }, required: ['label', 'minutes'] } } },
  required: ['day', 'objective', 'tasks', 'exercise', 'segments'] };

export function schemaFor(request) {
  const content = { type: 'object', properties: { text: string, code: string, durationDays: { type: 'integer' }, minutesPerDay: { type: 'integer' },
    days: { type: 'array', items: day }, projectName: string, goal: string, features: stringList, firstSteps: stringList, difficulty: string },
    required: request.kind === 'study_plan' ? ['durationDays', 'minutesPerDay', 'days']
      : request.kind === 'project' ? ['projectName', 'goal', 'features', 'firstSteps', 'difficulty'] : ['text'] };
  return { type: 'object', properties: { schemaVersion: { type: 'integer' }, kind: { type: 'string', enum: ['faq','explanation','study_plan','project','mixed','clarification'] },
    action: { type: 'string', enum: ['answer','clarify','offer_booking'] }, content, usedFactIds: stringList, missingInformation: stringList,
    suggestions: { type: 'array', items: suggestion } },
    required: ['schemaVersion','kind','action','content','usedFactIds','missingInformation','suggestions'] };
}
