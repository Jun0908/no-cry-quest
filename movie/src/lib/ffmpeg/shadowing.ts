import { existsSync } from "fs";
import { writeFile } from "fs/promises";
import { runFfmpeg } from "./ffmpeg";

export interface RenderSize {
  width: number;
  height: number;
}

const encoderArgs = [
  "-c:v",
  "libx264",
  "-preset",
  "veryfast",
  "-crf",
  "20",
  "-c:a",
  "aac",
  "-ar",
  "48000",
  "-ac",
  "2",
  "-movflags",
  "+faststart",
];

const scalePadFilter = (size: RenderSize): string =>
  `scale=${size.width}:${size.height}:force_original_aspect_ratio=decrease,pad=${size.width}:${size.height}:(ow-iw)/2:(oh-ih)/2:color=black`;

const wrapEnglishText = (text: string, maxLineLength: number): string[] => {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const lines: string[] = [];
  const words = normalized.split(" ").filter(Boolean);
  let current = "";

  for (const word of words) {
    if (word.length > maxLineLength) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += maxLineLength) {
        lines.push(word.slice(i, i + maxLineLength));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLineLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
};

const wrapJapaneseText = (text: string, maxLineLength: number): string[] => {
  const normalized = text.replace(/\s+/g, "").trim();
  if (!normalized) return [];

  const lines: string[] = [];
  for (let i = 0; i < normalized.length; i += maxLineLength) {
    lines.push(normalized.slice(i, i + maxLineLength));
  }
  return lines;
};

const escapeDrawText = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");

const sanitizeSubtitleLine = (value: string): string =>
  value.replace(/'/g, "");

const escapeFontPath = (path: string): string =>
  path.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");

const resolveSubtitleFontPath = (): string | undefined => {
  const candidates = [
    process.env.SUBTITLE_FONT_FILE,
    "C:\\Windows\\Fonts\\NotoSansJP-VF.ttf",
    "C:\\Windows\\Fonts\\meiryo.ttc",
    "C:\\Windows\\Fonts\\YuGothR.ttc",
    "C:\\Windows\\Fonts\\YuGothM.ttc",
    "C:\\Windows\\Fonts\\msgothic.ttc",
  ].filter((value): value is string => Boolean(value));

  return candidates.find((path) => existsSync(path));
};

const subtitleFontPath = resolveSubtitleFontPath();
const subtitleFontOption = subtitleFontPath
  ? `:fontfile='${escapeFontPath(subtitleFontPath)}'`
  : "";

interface SubtitleLayout {
  fontSize: number;
  lineHeight: number;
  leftMargin: number;
  topMargin: number;
  boxWidth: number;
  boxHeight: number;
  innerPadding: number;
  enLines: string[];
  jaLines: string[];
}

const buildSubtitleLayout = ({
  subtitleEn,
  subtitleJa,
  size,
}: {
  subtitleEn: string;
  subtitleJa?: string;
  size: RenderSize;
}): SubtitleLayout => {
  const leftMargin = Math.max(20, Math.round(size.width * 0.04));
  const topMargin = Math.max(18, Math.round(size.height * 0.03));
  const bottomSafe = Math.max(18, Math.round(size.height * 0.03));
  const innerPadding = Math.max(12, Math.round(size.height * 0.016));
  const usableWidth = size.width - leftMargin * 2 - innerPadding * 2;
  const usableHeight = size.height - topMargin - bottomSafe - innerPadding * 2;

  const maxFontSize = Math.max(24, Math.round(size.height * 0.047));
  const minFontSize = 8;

  let chosenFontSize = minFontSize;
  let chosenLineHeight = Math.max(12, Math.round(minFontSize * 1.32));
  let chosenEnLines = wrapEnglishText(subtitleEn, Math.max(6, Math.floor(usableWidth / 6)));
  let chosenJaLines = wrapJapaneseText(subtitleJa ?? "", Math.max(4, Math.floor(usableWidth / 8)));

  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 1) {
    const enCharsPerLine = Math.max(8, Math.floor(usableWidth / (fontSize * 0.58)));
    const jaCharsPerLine = Math.max(6, Math.floor(usableWidth / (fontSize * 0.97)));
    const enLines = wrapEnglishText(subtitleEn, enCharsPerLine);
    const jaLines = wrapJapaneseText(subtitleJa ?? "", jaCharsPerLine);
    const lineHeight = Math.max(12, Math.round(fontSize * 1.32));
    const languageGap = jaLines.length > 0 ? Math.max(2, Math.round(lineHeight * 0.35)) : 0;
    const textHeight = enLines.length * lineHeight + jaLines.length * lineHeight + languageGap;

    if (textHeight <= usableHeight) {
      chosenFontSize = fontSize;
      chosenLineHeight = lineHeight;
      chosenEnLines = enLines;
      chosenJaLines = jaLines;
      break;
    }
  }

  const languageGap = chosenJaLines.length > 0 ? Math.max(2, Math.round(chosenLineHeight * 0.35)) : 0;
  const textHeight =
    chosenEnLines.length * chosenLineHeight +
    chosenJaLines.length * chosenLineHeight +
    languageGap;

  return {
    fontSize: chosenFontSize,
    lineHeight: chosenLineHeight,
    leftMargin,
    topMargin,
    boxWidth: size.width - leftMargin * 2,
    boxHeight: textHeight + innerPadding * 2,
    innerPadding,
    enLines: chosenEnLines,
    jaLines: chosenJaLines,
  };
};

const buildSubtitleFilter = ({
  subtitleEn,
  subtitleJa,
  size,
}: {
  subtitleEn: string;
  subtitleJa?: string;
  size: RenderSize;
}): string => {
  const layout = buildSubtitleLayout({
    subtitleEn,
    subtitleJa,
    size,
  });

  const filters: string[] = [];
  filters.push(
    `drawbox=x=${layout.leftMargin}:y=${layout.topMargin}:w=${layout.boxWidth}:h=${layout.boxHeight}:color=black@0.58:t=fill`
  );

  let lineIndex = 0;
  const textX = layout.leftMargin + layout.innerPadding;
  let textY = layout.topMargin + layout.innerPadding;
  for (const line of layout.enLines) {
    const escaped = escapeDrawText(sanitizeSubtitleLine(line));
    filters.push(
      `drawtext=expansion=none${subtitleFontOption}:text='${escaped}':fontcolor=white:fontsize=${layout.fontSize}:x=${textX}:y=${textY}:shadowx=1:shadowy=1`
    );
    lineIndex += 1;
    textY = layout.topMargin + layout.innerPadding + lineIndex * layout.lineHeight;
  }

  if (layout.jaLines.length > 0) {
    textY += Math.max(2, Math.round(layout.lineHeight * 0.35));
    for (const line of layout.jaLines) {
      const escaped = escapeDrawText(sanitizeSubtitleLine(line));
      filters.push(
        `drawtext=expansion=none${subtitleFontOption}:text='${escaped}':fontcolor=white:fontsize=${layout.fontSize}:x=${textX}:y=${Math.round(
          textY
        )}:shadowx=1:shadowy=1`
      );
      textY += layout.lineHeight;
    }
  }

  return filters.join(",");
};

export const trimSegment = async ({
  inputPath,
  outputPath,
  startSec,
  durationSec,
  size,
}: {
  inputPath: string;
  outputPath: string;
  startSec: number;
  durationSec: number;
  size: RenderSize;
}): Promise<void> => {
  await runFfmpeg([
    "-y",
    "-ss",
    startSec.toFixed(3),
    "-t",
    durationSec.toFixed(3),
    "-i",
    inputPath,
    "-vf",
    scalePadFilter(size),
    ...encoderArgs,
    outputPath,
  ]);
};

export const extractMonoWav = async (
  inputPath: string,
  outputPath: string
): Promise<void> => {
  await runFfmpeg([
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    outputPath,
  ]);
};

export const adjustAudioSpeed = async ({
  inputPath,
  outputPath,
  speed,
}: {
  inputPath: string;
  outputPath: string;
  speed: number;
}): Promise<void> => {
  await runFfmpeg([
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-filter:a",
    `atempo=${speed.toFixed(3)}`,
    "-c:a",
    "mp3",
    "-ar",
    "44100",
    "-ac",
    "1",
    outputPath,
  ]);
};

export const renderOriginalPass = async (
  segmentPath: string,
  outputPath: string,
  size: RenderSize
): Promise<void> => {
  await runFfmpeg([
    "-y",
    "-i",
    segmentPath,
    "-vf",
    scalePadFilter(size),
    ...encoderArgs,
    outputPath,
  ]);
};

export const renderSimplePass = async ({
  segmentPath,
  outputPath,
  durationSec,
  backgroundImagePath,
  size,
}: {
  segmentPath: string;
  outputPath: string;
  durationSec: number;
  backgroundImagePath?: string;
  size: RenderSize;
}): Promise<void> => {
  if (backgroundImagePath) {
    await runFfmpeg([
      "-y",
      "-loop",
      "1",
      "-i",
      backgroundImagePath,
      "-i",
      segmentPath,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-vf",
      scalePadFilter(size),
      "-shortest",
      ...encoderArgs,
      outputPath,
    ]);
    return;
  }

  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=#101820:s=${size.width}x${size.height}:d=${durationSec.toFixed(3)}`,
    "-i",
    segmentPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-shortest",
    ...encoderArgs,
    outputPath,
  ]);
};

export const renderSimpleSubtitlePass = async ({
  audioPath,
  outputPath,
  durationSec,
  subtitleEn,
  subtitleJa,
  size,
}: {
  audioPath: string;
  outputPath: string;
  durationSec: number;
  subtitleEn: string;
  subtitleJa?: string;
  size: RenderSize;
}): Promise<void> => {
  const filter = buildSubtitleFilter({
    subtitleEn,
    subtitleJa,
    size,
  });
  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=#101820:s=${size.width}x${size.height}:d=${durationSec.toFixed(3)}`,
    "-i",
    audioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-vf",
    filter,
    "-shortest",
    ...encoderArgs,
    outputPath,
  ]);
};

export const renderOriginalSubtitlePass = async ({
  segmentPath,
  outputPath,
  subtitleEn,
  subtitleJa,
  size,
}: {
  segmentPath: string;
  outputPath: string;
  subtitleEn: string;
  subtitleJa?: string;
  size: RenderSize;
}): Promise<void> => {
  const filter = `${scalePadFilter(size)},${buildSubtitleFilter({
    subtitleEn,
    subtitleJa,
    size,
  })}`;
  await runFfmpeg([
    "-y",
    "-i",
    segmentPath,
    "-vf",
    filter,
    ...encoderArgs,
    outputPath,
  ]);
};

const toConcatPath = (inputPath: string): string => inputPath.replace(/\\/g, "/");

export const writeConcatList = async (
  listPath: string,
  files: string[]
): Promise<void> => {
  const lines = files.map((filePath) => `file '${toConcatPath(filePath)}'`);
  await writeFile(listPath, `${lines.join("\n")}\n`, "utf-8");
};

export const concatVideos = async ({
  listPath,
  outputPath,
}: {
  listPath: string;
  outputPath: string;
}): Promise<void> => {
  await runFfmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    ...encoderArgs,
    outputPath,
  ]);
};
