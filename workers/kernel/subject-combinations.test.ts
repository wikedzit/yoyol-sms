import assert from 'node:assert/strict';
import test from 'node:test';
import { describeCombinations, refusalToChangeCombination } from './subject-combinations.ts';

test('MOD-ACA-05 an A-Level combination lists its subjects and a retired one cannot grow', () => {
  assert.equal(refusalToChangeCombination({
    status: 'active',
    change: 'add',
    subjectLevelType: 'o-level',
  }), 'Only an A-Level subject can be added to a combination.');
  assert.equal(refusalToChangeCombination({
    status: 'retired',
    change: 'add',
    subjectLevelType: 'a-level',
  }), 'That combination is retired.');
  assert.equal(refusalToChangeCombination({
    status: 'active',
    change: 'add',
    subjectLevelType: 'a-level',
  }), null);

  assert.deepEqual(describeCombinations({
    combinations: [
      { id: 1, name: 'PCB', status: 'active' },
      { id: 2, name: 'PCM', status: 'retired' },
    ],
    subjects: [
      { id: 4, name: 'Physics', code: 'PHY' },
      { id: 5, name: 'Chemistry', code: 'CHE' },
    ],
    links: [
      { combinationId: 1, subjectId: 4 },
      { combinationId: 1, subjectId: 5 },
    ],
  }), [
    'PCB: Physics (PHY), Chemistry (CHE)',
    'PCM (retired)',
  ]);
});
