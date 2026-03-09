import "dotenv/config";
import { resolve } from "path";
import { writeFileSync, createWriteStream, readFileSync, existsSync } from "fs";
import { pipeline } from "stream/promises";
import axios from "axios";
import { OpenAiScenarioProvider } from "../src/lib/scenario/openai";
import { OpenAiImageProvider } from "../src/lib/image/openai";
import { execSync } from "child_process";
import { ScenarioDefinition } from "../src/lib/scenario/types";

async function downloadImage(url: string, outputPath: string) {
    const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
    });
    await pipeline(response.data, createWriteStream(outputPath));
}

async function main() {
    const input = process.argv.slice(2).join(" ");
    if (!input) {
        console.error("使用法: npx tsx scripts/automate.ts \"動画のテーマ\" または scenario.json");
        process.exit(1);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is missing.");
    }

    let scenario: ScenarioDefinition;

    if (input.endsWith(".json") && existsSync(input)) {
        console.log(`[automate] JSONファイルを読み込み中: ${input}`);
        scenario = JSON.parse(readFileSync(input, "utf-8"));
    } else {
        const scenarioProvider = new OpenAiScenarioProvider({ apiKey });
        console.log(`[automate] シナリオ生成中: "${input}"`);
        scenario = await scenarioProvider.generateScenario(input);
    }

    const imageProvider = new OpenAiImageProvider({ apiKey });
    console.log(`[automate] タイトル: ${scenario.title}`);

    const sceneItems: string[] = [];

    for (const [index, scene] of scenario.scenes.entries()) {
        console.log(`[automate] シーン ${index + 1}/${scenario.scenes.length}: ${scene.id}`);

        // 1. 画像生成
        console.log(`[automate]   画像生成中: ${scene.imagePrompt}`);
        const imageResult = await imageProvider.generateImage({ prompt: scene.imagePrompt });
        const imagePath = resolve(`public/${scene.id}.png`);
        await downloadImage(imageResult.url, imagePath);
        console.log(`[automate]   画像保存: ${imagePath}`);

        // 2. スクリプト行の構築
        const startFrame = index * 240; // 仮の開始位置（voices の後に調整されるが初期値として）
        sceneItems.push(`  {
    id: "${scene.id}",
    text: "${scene.text.replace(/"/g, '\\"')}",
    narration: "${scene.narration.replace(/"/g, '\\"')}",
    durationInFrames: 150,
    startFrame: ${startFrame},
  },`);
    }

    // 3. scriptLines.ts の更新（型定義を含む）
    const scriptLinesContent = `export interface ScriptLine {
  id: string;
  text: string;
  narration: string;
  durationInFrames: number;
  startFrame?: number;
  pauseAfter?: number;
}

export const RAW_SCRIPT: ScriptLine[] = [
${sceneItems.join("\n")}
];
`;
    const scriptLinesPath = resolve("src/data/scriptLines.ts");
    writeFileSync(scriptLinesPath, scriptLinesContent);
    console.log(`[automate] スクリプト更新: ${scriptLinesPath}`);

    // 4. 音声生成 (npm run voices)
    console.log("[automate] 音声生成中 (npm run voices)...");
    execSync("cmd /c \"npm run voices\"", { stdio: "inherit" });

    // 5. 動画ビルド (npm run build)
    console.log("[automate] 動画レンダリング中 (npm run build)...");
    execSync("cmd /c \"npm run build\"", { stdio: "inherit" });

    console.log("[automate] 完了! 動画は out/video.mp4 に出力されました。");
}

main().catch((err) => {
    console.error("[automate] 失敗:", err);
    process.exit(1);
});
