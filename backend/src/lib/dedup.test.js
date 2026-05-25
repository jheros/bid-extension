import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jaccardSimilarity, deduplicateJob, DEDUP_SIMILARITY_THRESHOLD } from './dedup.js';

// ── jaccardSimilarity ────────────────────────────────────────────────────────

test('identical descriptions return 1.0', () => {
  const text = 'build scalable web applications with nodejs';
  assert.equal(jaccardSimilarity(text, text), 1.0);
});

test('completely different descriptions return 0', () => {
  assert.equal(jaccardSimilarity('cat dog bird', 'apple banana cherry'), 0);
});

test('partial overlap returns correct ratio', () => {
  // {the, quick, brown, fox} vs {the, slow, brown, cat}
  // intersection={the,brown}=2, union={the,quick,brown,fox,slow,cat}=6 → 2/6 ≈ 0.333
  const result = jaccardSimilarity('the quick brown fox', 'the slow brown cat');
  assert.equal(result.toFixed(3), '0.333');
});

test('null inputs return 0', () => {
  assert.equal(jaccardSimilarity(null, 'some text'), 0);
  assert.equal(jaccardSimilarity('some text', null), 0);
  assert.equal(jaccardSimilarity(null, null), 0);
});

test('empty string inputs return 0', () => {
  assert.equal(jaccardSimilarity('', ''), 0);
  assert.equal(jaccardSimilarity('hello', ''), 0);
});

test('comparison is case-insensitive', () => {
  assert.equal(jaccardSimilarity('Hello World', 'hello world'), 1.0);
});

test('punctuation is ignored', () => {
  assert.equal(jaccardSimilarity('hello, world!', 'hello world'), 1.0);
});

// ── deduplicateJob ───────────────────────────────────────────────────────────

function buildMock(selectResult, softDeleted) {
  const queryChain = {
    select() { return this; },
    ilike() { return this; },
    neq() { return this; },
    eq() { return Promise.resolve({ data: selectResult, error: null }); },
  };

  return {
    from() {
      return {
        select: () => queryChain,
        update: () => ({
          eq: (col, val) => {
            if (col === 'id') softDeleted.push(val);
            return Promise.resolve({ error: null });
          },
        }),
      };
    },
  };
}

test('soft-deletes candidates above similarity threshold', async () => {
  const softDeleted = [];
  const mockSupabase = buildMock(
    [{ id: 10, description: 'build scalable web apps with nodejs and express' }],
    softDeleted
  );

  await deduplicateJob(mockSupabase, {
    externalId: 'ext-new',
    title: 'Backend Engineer',
    companyName: 'Acme Corp',
    description: 'build scalable web apps with nodejs and express and typescript',
  });

  assert.deepEqual(softDeleted, [10]);
});

test('does not soft-delete candidates below similarity threshold', async () => {
  const softDeleted = [];
  const mockSupabase = buildMock(
    [{ id: 20, description: 'design pixel perfect ui components in react' }],
    softDeleted
  );

  await deduplicateJob(mockSupabase, {
    externalId: 'ext-new',
    title: 'Backend Engineer',
    companyName: 'Acme Corp',
    description: 'build scalable backend apis with nodejs and postgresql',
  });

  assert.deepEqual(softDeleted, []);
});

test('soft-deletes multiple matches when several exceed threshold', async () => {
  const softDeleted = [];
  const sharedDesc = 'build rest apis with nodejs express postgresql docker';
  const mockSupabase = buildMock(
    [
      { id: 30, description: sharedDesc },
      { id: 31, description: sharedDesc + ' and kubernetes' },
    ],
    softDeleted
  );

  await deduplicateJob(mockSupabase, {
    externalId: 'ext-new',
    title: 'Backend Engineer',
    companyName: 'Acme Corp',
    description: sharedDesc,
  });

  assert.deepEqual(softDeleted.sort(), [30, 31]);
});

test('handles DB query error without throwing', async () => {
  const mockSupabase = {
    from: () => ({
      select: () => ({
        ilike: () => ({ ilike: () => ({ neq: () => ({ eq: () => Promise.resolve({ data: null, error: new Error('db error') }) }) }) }),
      }),
    }),
  };

  await assert.doesNotReject(() =>
    deduplicateJob(mockSupabase, {
      externalId: 'ext-new',
      title: 'Engineer',
      companyName: 'Corp',
      description: 'some description',
    })
  );
});

test('does nothing when no candidates returned', async () => {
  const softDeleted = [];
  const mockSupabase = buildMock([], softDeleted);

  await deduplicateJob(mockSupabase, {
    externalId: 'ext-new',
    title: 'Engineer',
    companyName: 'Corp',
    description: 'some description',
  });

  assert.deepEqual(softDeleted, []);
});
