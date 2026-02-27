import { promises as fs } from 'fs';
import path from 'path';

const DATA_PATH = path.resolve(process.cwd(), 'data', 'shard-submissions.json');

type Submission = {
  shard: string;
  walletAddress: string;
  timestamp: number;
};

async function ensureDirAndFile() {
  const dir = path.dirname(DATA_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
  try {
    await fs.access(DATA_PATH);
  } catch (e) {
    await fs.writeFile(DATA_PATH, JSON.stringify({}), 'utf8');
  }
}

async function readAll(): Promise<Record<string, Submission[]>> {
  await ensureDirAndFile();
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  try {
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

async function writeAll(data: Record<string, Submission[]>) {
  await ensureDirAndFile();
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export async function getSubmissions(questId: string) {
  const all = await readAll();
  return all[questId] || [];
}

export async function addSubmission(questId: string, sub: Submission) {
  const all = await readAll();
  const arr = all[questId] || [];

  // prevent duplicate by wallet
  if (arr.find((s) => s.walletAddress.toLowerCase() === sub.walletAddress.toLowerCase())) {
    throw new Error('wallet_already_submitted');
  }

  // prevent duplicate shard value
  if (arr.find((s) => s.shard === sub.shard)) {
    throw new Error('shard_already_submitted');
  }

  // limit to 4 submissions
  if (arr.length >= 4) {
    throw new Error('max_submissions_reached');
  }

  arr.push(sub);
  all[questId] = arr;
  await writeAll(all);
  return arr.length;
}

export async function clearSubmissions() {
  await writeAll({});
}

export default {
  getSubmissions,
  addSubmission,
  clearSubmissions,
};
