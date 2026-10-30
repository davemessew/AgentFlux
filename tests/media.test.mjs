import test from 'node:test';
import assert from 'node:assert/strict';
import { videoSegments, selectFrames } from '../server/media.mjs';

test('long recordings retain overlapping coverage instead of a global frame cap', () => {
  const segments = videoSegments(1800);
  assert.equal(segments.length, 30); assert.equal(segments.at(-1).end, 1800);
  for (let index = 1; index < segments.length; index++) assert.ok(segments[index].start < segments[index - 1].end);
  const candidates = Array.from({ length: 120 }, (_, index) => ({ at: index / 2, hash: String(index % 30) }));
  const frames = selectFrames(candidates, 0, 60);
  assert.equal(frames.length, 24);
  for (let second = 0; second < 60; second += 5) assert.ok(frames.some(frame => frame.at === second));
  assert.ok(frames.some(frame => frame.at === 0.5));
});

test('duplicate images do not consume every change slot', () => {
  const candidates = Array.from({ length: 120 }, (_, index) => ({ at: index / 2, hash: index === 3 ? 'brief-change' : 'static' }));
  const frames = selectFrames(candidates, 0, 60);
  assert.ok(frames.some(frame => frame.hash === 'brief-change'));
  assert.ok(frames.length < 24);
});
