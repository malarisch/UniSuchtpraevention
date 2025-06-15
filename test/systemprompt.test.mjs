import fs from 'fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('systemprompt contains DrugAnaBot', async () => {
  const content = await fs.readFile('./systemprompt.txt', 'utf8');
  assert.ok(content.includes('DrugAnaBot'));
});
