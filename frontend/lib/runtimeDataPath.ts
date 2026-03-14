import path from "path";

const LOCAL_DATA_ROOT = path.resolve(process.cwd(), "data");
const SERVERLESS_DATA_ROOT = path.join(
  process.env.TMPDIR || process.env.TEMP || "/tmp",
  "no-cry-data"
);

function shouldUseServerlessDataRoot() {
  return Boolean(
    process.env.VERCEL ||
      process.env.LAMBDA_TASK_ROOT ||
      process.env.AWS_EXECUTION_ENV
  );
}

export function getRuntimeDataPath(fileName: string) {
  if (process.env.NO_CRY_DATA_DIR) {
    return path.resolve(process.env.NO_CRY_DATA_DIR, fileName);
  }

  return shouldUseServerlessDataRoot()
    ? path.join(SERVERLESS_DATA_ROOT, fileName)
    : path.join(LOCAL_DATA_ROOT, fileName);
}
