import { spawn } from "node:child_process";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      cwd: process.cwd(),
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`command failed: ${command} ${args.join(" ")}`));
      }
    });
  });
}

async function main() {
  await run("npx", ["tsc", "--noEmit"]);
  await run("npx", [
    "eslint",
    "app/final/page.tsx",
    "app/api/task10/check/route.ts",
    "app/api/task10/check/simulate-success/route.ts",
    "app/api/task10/puzzle/route.ts",
    "app/api/task10/puzzle/solve/route.ts",
    "app/api/task10/hint/route.ts",
    "lib/task10Config.ts",
    "lib/task10Puzzle.ts",
    "lib/task10StateStore.ts",
    "lib/task10Judge.ts",
  ]);
  process.stdout.write("task10 checks passed\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
