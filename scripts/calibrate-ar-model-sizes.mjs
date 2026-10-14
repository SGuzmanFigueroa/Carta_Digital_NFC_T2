import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const targetSizesCm = {
  'smoked-old-fashioned': 12,
  'aji-de-gallina': 25,
  'causa-limena': 20,
  'esfera-chocolate': 18,
  'tartar-nikkei': 20,
  'chaufa-wok': 26,
  'risotto-porcini': 25,
  'lomo-saltado': 27,
  'pulpo-brasa': 26,
  'wagyu-a5': 28,
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const modelsDir = path.resolve(scriptDir, '../public/models-ar');

function calibrateGlb(filePath, targetCm) {
  const input = fs.readFileSync(filePath);
  const jsonLength = input.readUInt32LE(12);
  const jsonType = input.readUInt32LE(16);
  const json = JSON.parse(input.subarray(20, 20 + jsonLength).toString('utf8').replace(/\u0000+$/u, '').trimEnd());
  const currentMeters = Number(json.asset?.extras?.targetMaxDimensionMeters ?? 0.28);
  const targetMeters = targetCm / 100;
  const factor = targetMeters / currentMeters;
  const root = json.nodes?.find((node) => node.name?.startsWith('AR_Normalized_Root'));

  if (!root?.scale || !root?.translation) {
    throw new Error(`No se encontró el nodo AR normalizado en ${path.basename(filePath)}`);
  }

  root.scale = root.scale.map((value) => Number((value * factor).toFixed(8)));
  root.translation = root.translation.map((value) => Number((value * factor).toFixed(8)));
  root.name = `AR_Normalized_Root_${targetCm}cm`;
  json.asset.extras = {
    ...json.asset.extras,
    arNormalized: true,
    targetMaxDimensionMeters: targetMeters,
    generatedBy: 'Codex AR proportional calibration',
  };

  const rawJson = Buffer.from(JSON.stringify(json));
  const paddedLength = Math.ceil(rawJson.length / 4) * 4;
  const paddedJson = Buffer.alloc(paddedLength, 0x20);
  rawJson.copy(paddedJson);
  const remaining = input.subarray(20 + jsonLength);
  const output = Buffer.alloc(20 + paddedLength + remaining.length);

  input.copy(output, 0, 0, 12);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(paddedLength, 12);
  output.writeUInt32LE(jsonType, 16);
  paddedJson.copy(output, 20);
  remaining.copy(output, 20 + paddedLength);
  fs.writeFileSync(filePath, output);
}

for (const [dishId, targetCm] of Object.entries(targetSizesCm)) {
  const filePath = path.join(modelsDir, `${dishId}.glb`);
  calibrateGlb(filePath, targetCm);
  console.log(`${dishId}: ${targetCm} cm`);
}
