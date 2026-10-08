import assert from 'node:assert/strict';
import test from 'node:test';
import { describeLinkedSubjects, subjectLevelLink } from './academic-subjects.ts';

test('MOD-ACA-03 a subject belongs to a level, and the stream is optional', () => {
  const lines = describeLinkedSubjects({
    levels: [{ id: 1, name: 'O-Level' }],
    streams: [{ id: 4, levelId: 1, name: 'Science' }],
    subjects: [
      { name: 'Mathematics', code: 'MAT', levelId: 1, streamId: null },
      { name: 'Physics', code: 'PHY', levelId: null, streamId: 4 },
      { name: 'Orphan', code: 'ORP', levelId: null, streamId: null },
    ],
  });

  assert.deepEqual(lines, [
    'O-Level / Mathematics (MAT)',
    'O-Level / Science / Physics (PHY)',
  ]);
});

test('MOD-ACA-03 a stream from another level is refused', () => {
  const refused = subjectLevelLink({
    levelId: 1,
    streamId: 8,
    streams: [{ id: 8, levelId: 2, name: 'Science' }],
  });
  const accepted = subjectLevelLink({
    levelId: 1,
    streamId: null,
    streams: [{ id: 8, levelId: 2, name: 'Science' }],
  });
  assert.deepEqual(refused, { error: 'Choose a stream from the same level.' });
  assert.deepEqual(accepted, { levelId: 1, streamId: null });
});
