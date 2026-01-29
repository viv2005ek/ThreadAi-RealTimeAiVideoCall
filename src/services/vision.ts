import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';
import { createWorker } from 'tesseract.js';
import { VisionContext } from '../types';

let model: cocoSsd.ObjectDetection | null = null;

export async function loadObjectDetectionModel(): Promise<void> {
  if (!model) {
    console.log('Loading TensorFlow and COCO-SSD model...');
    await tf.ready();
    console.log('TensorFlow ready');
    model = await cocoSsd.load();
    console.log('COCO-SSD model loaded successfully');
  } else {
    console.log('COCO-SSD model already loaded');
  }
}

export async function detectObjects(imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
  if (!model) {
    await loadObjectDetectionModel();
  }
  return await model!.detect(imageElement);
}

export async function extractText(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<string> {
  try {
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(imageElement);
    await worker.terminate();
    return data.text.trim();
  } catch (error) {
    console.error('Error extracting text:', error);
    return '';
  }
}

export function analyzeDepth(objects: Array<{ class: string; score: number; bbox: number[] }>): string {
  if (objects.length === 0) return 'No objects detected for depth analysis.';

  const sortedBySize = [...objects].sort((a, b) => {
    const areaA = a.bbox[2] * a.bbox[3];
    const areaB = b.bbox[2] * b.bbox[3];
    return areaB - areaA;
  });

  const depthDescriptions: string[] = [];

  sortedBySize.forEach((obj, index) => {
    const area = obj.bbox[2] * obj.bbox[3];
    let depthLevel = '';

    if (index === 0 && area > 50000) {
      depthLevel = 'very close/foreground';
    } else if (area > 30000) {
      depthLevel = 'close';
    } else if (area > 10000) {
      depthLevel = 'middle distance';
    } else {
      depthLevel = 'far/background';
    }

    depthDescriptions.push(`${obj.class} (${depthLevel})`);
  });

  return depthDescriptions.join(', ');
}

export async function processVisionSnapshot(
  canvas: HTMLCanvasElement
): Promise<VisionContext> {
  console.log('🔍 ========== VISION SNAPSHOT PROCESSING START ==========');
  console.log('🔍 Timestamp:', new Date().toLocaleString());
  console.log('🔍 Canvas dimensions:', canvas.width, 'x', canvas.height);

  const timestamp = new Date();

  console.log('🎯 [OBJECT DETECTION] Starting COCO-SSD object detection...');
  const objects = await detectObjects(canvas);
  console.log('🎯 [OBJECT DETECTION] Objects detected:', objects.length);

  if (objects.length > 0) {
    console.log('🎯 [OBJECT DETECTION] Detailed object list:');
    objects.forEach((obj, index) => {
      const [x, y, width, height] = obj.bbox;
      const area = width * height;
      const confidence = Math.round(obj.score * 100);
      console.log(`   ${index + 1}. ${obj.class.toUpperCase()}`);
      console.log(`      - Confidence: ${confidence}%`);
      console.log(`      - Bounding Box: [x:${Math.round(x)}, y:${Math.round(y)}, w:${Math.round(width)}, h:${Math.round(height)}]`);
      console.log(`      - Area: ${Math.round(area)} pixels`);

      let depth = '';
      if (area > 50000) depth = 'VERY CLOSE/FOREGROUND';
      else if (area > 30000) depth = 'CLOSE';
      else if (area > 10000) depth = 'MIDDLE DISTANCE';
      else depth = 'FAR/BACKGROUND';
      console.log(`      - Estimated Depth: ${depth}`);
    });
  } else {
    console.log('🎯 [OBJECT DETECTION] No objects detected in frame');
  }

  console.log('📝 [TEXT EXTRACTION] Starting Tesseract OCR...');
  const text = await extractText(canvas);
  if (text && text.length > 3) {
    console.log('📝 [TEXT EXTRACTION] Text found:');
    console.log('📝 "' + text + '"');
  } else {
    console.log('📝 [TEXT EXTRACTION] No text detected');
  }

  console.log('📏 [DEPTH ANALYSIS] Analyzing spatial relationships...');
  const depthInfo = analyzeDepth(objects);
  console.log('📏 [DEPTH ANALYSIS] Depth ordering:', depthInfo);

  let description = '';
  let detailedAnalysis = '';

  if (objects.length > 0) {
    const sortedByDepth = [...objects].sort((a, b) => {
      const areaA = a.bbox[2] * a.bbox[3];
      const areaB = b.bbox[2] * b.bbox[3];
      return areaB - areaA;
    });

    const objectDescriptions = sortedByDepth.map(obj => {
      const confidence = Math.round(obj.score * 100);
      const [x, y, width, height] = obj.bbox;
      const area = width * height;

      let position = '';
      let depth = '';
      if (area > 50000) {
        position = 'very close in front of the camera, dominating the view';
        depth = 'foreground';
      } else if (area > 30000) {
        position = 'close to the camera';
        depth = 'near';
      } else if (area > 10000) {
        position = 'at medium distance';
        depth = 'middle';
      } else {
        position = 'in the background';
        depth = 'far';
      }

      let horizontalPos = '';
      const centerX = x + width / 2;
      const canvasCenter = canvas.width / 2;
      if (centerX < canvasCenter - canvas.width * 0.2) {
        horizontalPos = 'on the left side';
      } else if (centerX > canvasCenter + canvas.width * 0.2) {
        horizontalPos = 'on the right side';
      } else {
        horizontalPos = 'in the center';
      }

      return {
        text: `${obj.class} (${confidence}% confidence, ${position}, ${horizontalPos})`,
        detailed: `- ${obj.class.toUpperCase()}: ${confidence}% confidence, ${depth} depth, position [${Math.round(x)},${Math.round(y)}], size ${Math.round(width)}x${Math.round(height)}, ${horizontalPos}`
      };
    });

    description = `I can see: ${objectDescriptions.map(d => d.text).join('; ')}`;
    detailedAnalysis = 'DETECTED OBJECTS:\n' + objectDescriptions.map(d => d.detailed).join('\n');

    if (text && text.length > 3) {
      description += `. VISIBLE TEXT: "${text.substring(0, 200)}"`;
      detailedAnalysis += `\n\nEXTRACTED TEXT:\n"${text}"`;
    }
  } else {
    description = 'No recognizable objects detected in the current camera view';
    detailedAnalysis = 'DETECTED OBJECTS: None';

    if (text && text.length > 3) {
      description += `, but I can see text: "${text.substring(0, 100)}"`;
      detailedAnalysis += `\n\nEXTRACTED TEXT:\n"${text}"`;
    }
  }

  console.log('💬 [VISION SUMMARY] Description for AI:', description);
  console.log('📋 [DETAILED ANALYSIS]:\n' + detailedAnalysis);
  console.log('🔍 ========== VISION SNAPSHOT PROCESSING END ==========\n');

  return {
    timestamp,
    objects: objects.map(obj => ({
      class: obj.class,
      score: obj.score,
      bbox: obj.bbox
    })),
    text,
    description,
    detailedAnalysis
  };
}
