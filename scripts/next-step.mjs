import { readFileSync } from 'node:fs';

const TASK_FILE = 'TASK.md';
const CHECKBOX = /^\s*-\s*\[([ xX])\]\s*(.*)$/;

function readTaskFile() {
  try {
    return readFileSync(TASK_FILE, 'utf8').split(/\r?\n/);
  } catch (error) {
    console.error(`[next-step] TASK.md를 읽지 못했습니다: ${error.message}`);
    process.exit(1);
  }
}

function collectPending(lines) {
  return lines
    .map((line) => CHECKBOX.exec(line))
    .filter((match) => !!match && match[1] === ' ')
    .map((match) => match[2].trim())
    .filter((text) => text.length > 0);
}

function main() {
  const lines = readTaskFile();
  const pending = collectPending(lines);

  if (pending.length === 0) {
    console.log('[next-step] TASK.md의 모든 항목이 완료됐습니다.');
    return;
  }

  const next = pending[0];
  console.log('[next-step] 다음 할 일:');
  console.log(`- ${next}`);
  console.log('');
  console.log('완료 후 TASK.md에서 해당 항목을 `- [x]`로 바꾼 뒤 다시 실행하세요.');
  console.log('실행: npm run next:task');
}

main();
