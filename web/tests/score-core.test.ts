import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildScoreShareText,
    calculateWeightedScore,
    readPersistedScores,
    SCORE_STORAGE_TTL_MS,
    serializePersistedScores,
    validateScores,
} from '../lib/score-core';

const validScores = {
    redacao: 700,
    linguagens: 650,
    humanas: 600,
    natureza: 550,
    matematica: 500,
};

const equalWeights = {
    peso_red: 1,
    peso_ling: 1,
    peso_ch: 1,
    peso_cn: 1,
    peso_mat: 1,
};

test('score validation accepts only finite values from 0 through 1000', () => {
    assert.equal(validateScores({ ...validScores, redacao: 0, matematica: 1000 }).valid, true);

    const belowRange = validateScores({ ...validScores, redacao: -0.01 });
    assert.equal(belowRange.valid, false);
    assert.equal(belowRange.issues[0]?.reason, 'out_of_range');

    const aboveRange = validateScores({ ...validScores, natureza: 1000.01 });
    assert.equal(aboveRange.valid, false);
    assert.equal(aboveRange.issues[0]?.reason, 'out_of_range');

    assert.equal(validateScores({ ...validScores, humanas: Number.NaN }).valid, false);
    assert.equal(validateScores({ ...validScores, linguagens: undefined }).valid, false);
});

test('weighted calculation preserves a real zero weight', () => {
    const result = calculateWeightedScore(
        { ...validScores, redacao: 1000, linguagens: 500, humanas: 500, natureza: 500, matematica: 500 },
        { ...equalWeights, peso_red: 0 },
    );

    assert.equal(result.weights.redacao.status, 'provided');
    assert.equal(result.weights.redacao.value, 0);
    assert.equal(result.totalWeight, 4);
    assert.equal(result.average, 500);
});

test('weighted calculation refuses an all-zero denominator', () => {
    const result = calculateWeightedScore(validScores, {
        peso_red: 0,
        peso_ling: 0,
        peso_ch: 0,
        peso_cn: 0,
        peso_mat: 0,
    });

    assert.equal(result.totalWeight, 0);
    assert.equal(result.average, null);
});

test('weighted calculation distinguishes null and absent weights without inventing defaults', () => {
    const result = calculateWeightedScore(validScores, {
        peso_red: null,
        peso_ling: 1,
        peso_ch: 1,
        peso_cn: 1,
    });

    assert.equal(result.weights.redacao.status, 'null');
    assert.equal(result.weights.matematica.status, 'missing');
    assert.equal(result.average, null);
});

test('minimum checks report subject and overall-score violations', () => {
    const result = calculateWeightedScore(validScores, {
        ...equalWeights,
        min_red: 750,
        min_enem: 700,
    });

    assert.equal(result.average, 600);
    assert.equal(result.minimums.status, 'failed');
    assert.deepEqual(
        result.minimums.violations.map(violation => violation.subject),
        ['redacao', 'enem'],
    );
});

test('opt-in persistence expires after 30 days and rejects legacy unconsented data', () => {
    const now = Date.UTC(2026, 7, 5, 12, 0, 0);
    const serialized = serializePersistedScores(validScores, now);

    const beforeExpiry = readPersistedScores(serialized, now + SCORE_STORAGE_TTL_MS - 1);
    assert.equal(beforeExpiry.status, 'valid');
    assert.deepEqual(beforeExpiry.scores, validScores);

    assert.equal(
        readPersistedScores(serialized, now + SCORE_STORAGE_TTL_MS).status,
        'expired',
    );
    assert.equal(readPersistedScores(JSON.stringify(validScores), now).status, 'invalid');
});

test('share copy describes margin without probability or admission claims', () => {
    const course = {
        name: 'Medicina',
        university: 'Universidade Exemplo',
        cut_score: 690,
    };
    const above = buildScoreShareText(course, 700);
    const below = buildScoreShareText(course, 680);

    assert.match(above, /10,00 pontos acima/);
    assert.match(below, /10,00 pontos abaixo/);
    assert.doesNotMatch(`${above}\n${below}`, /\b(?:chance|aprova|reprova)|\d+%/i);
    assert.match(above, /não representa resultado oficial/i);
});
