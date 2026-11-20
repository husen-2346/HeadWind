import type { Map as MapboxMap } from "mapbox-gl";
import { getRiskColor } from "@/lib/risk";
import type { RiskLevelName } from "@/types/api";

/**
 * Generates an ImageData object for a risk checkpoint shape and adds it to Mapbox.
 */
function createCheckpointImageData(
  level: RiskLevelName | "unknown",
  size = 32
): ImageData | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const color = getRiskColor(level);
  const strokeColor = "#0B0F14";
  const strokeWidth = 3;
  const half = size / 2;

  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = color;

  switch (level) {
    case "low":
      // Circle
      ctx.beginPath();
      ctx.arc(half, half, half - 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;

    case "moderate":
      // Triangle
      ctx.beginPath();
      ctx.moveTo(half, 4);
      ctx.lineTo(size - 4, size - 5);
      ctx.lineTo(4, size - 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case "high":
      // Diamond
      ctx.beginPath();
      ctx.moveTo(half, 3);
      ctx.lineTo(size - 3, half);
      ctx.lineTo(half, size - 3);
      ctx.lineTo(3, half);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case "severe":
      // Square
      ctx.beginPath();
      ctx.rect(5, 5, size - 10, size - 10);
      ctx.fill();
      ctx.stroke();
      break;

    case "no_travel": {
      // Octagon
      const d = 8;
      ctx.beginPath();
      ctx.moveTo(5 + d, 5);
      ctx.lineTo(size - 5 - d, 5);
      ctx.lineTo(size - 5, 5 + d);
      ctx.lineTo(size - 5, size - 5 - d);
      ctx.lineTo(size - 5 - d, size - 5);
      ctx.lineTo(5 + d, size - 5);
      ctx.lineTo(5, size - 5 - d);
      ctx.lineTo(5, 5 + d);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case "unknown":
    default:
      // Ring
      ctx.beginPath();
      ctx.arc(half, half, half - 6, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.stroke();
      break;
  }

  return ctx.getImageData(0, 0, size, size);
}

function createEndpointImageData(kind: "origin" | "destination", size = 36): ImageData | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const half = size / 2;
  const isOrigin = kind === "origin";
  const pinColor = isOrigin ? "#5CC8FF" : "#2E9CCA";

  // Outer ring
  ctx.beginPath();
  ctx.arc(half, half, half - 4, 0, Math.PI * 2);
  ctx.fillStyle = "#0B0F14";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = pinColor;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(half, half, half - 10, 0, Math.PI * 2);
  ctx.fillStyle = pinColor;
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

/**
 * Registers all custom checkpoint and pin icons on the Mapbox instance.
 */
export function registerMapIcons(map: MapboxMap): void {
  const levels: (RiskLevelName | "unknown")[] = [
    "low",
    "moderate",
    "high",
    "severe",
    "no_travel",
    "unknown",
  ];

  levels.forEach((lvl) => {
    const iconId = `checkpoint-${lvl}`;
    if (!map.hasImage(iconId)) {
      const imageData = createCheckpointImageData(lvl, 32);
      if (imageData) {
        map.addImage(iconId, imageData, { pixelRatio: 2 });
      }
    }
  });

  if (!map.hasImage("endpoint-origin")) {
    const originData = createEndpointImageData("origin", 36);
    if (originData) {
      map.addImage("endpoint-origin", originData, { pixelRatio: 2 });
    }
  }

  if (!map.hasImage("endpoint-destination")) {
    const destData = createEndpointImageData("destination", 36);
    if (destData) {
      map.addImage("endpoint-destination", destData, { pixelRatio: 2 });
    }
  }
}
