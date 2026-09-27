/**
 * Unit tests for messageService's input validation. These run without a
 * database connection: they exercise the validation branch that runs
 * BEFORE any DB call, which is real, deterministic logic independent of
 * MongoDB being reachable.
 *
 * Run with: node --test tests/messageService.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createMessage, ValidationError, DatabaseUnavailableError } = require('../src/services/messageService');

test('createMessage rejects missing username', async () => {
  await assert.rejects(
    () => createMessage({ username: '', message: 'hi' }),
    ValidationError
  );
});

test('createMessage rejects whitespace-only username', async () => {
  await assert.rejects(
    () => createMessage({ username: '   ', message: 'hi' }),
    ValidationError
  );
});

test('createMessage rejects missing message', async () => {
  await assert.rejects(
    () => createMessage({ username: 'Alice', message: '' }),
    ValidationError
  );
});

test('createMessage rejects non-string message', async () => {
  await assert.rejects(
    () => createMessage({ username: 'Alice', message: null }),
    ValidationError
  );
});

test('createMessage falls through to DatabaseUnavailableError when DB is down and input is valid', async () => {
  // With no active mongoose connection in this test run, valid input should
  // fail with DatabaseUnavailableError (503), not crash or hang.
  await assert.rejects(
    () => createMessage({ username: 'Alice', message: 'Hello Bob' }),
    DatabaseUnavailableError
  );
});
