export interface User {
  email: string;
  name: string;
  avatar?: string;
}

export interface ProcessedImage {
  id: string;
  originalUrl: string;
  processedUrl: string | null;
  timestamp: number;
}

export enum AppMode {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  EDITOR = 'EDITOR',
}

export enum EditorTool {
  AUTO_REMOVE = 'AUTO_REMOVE',
  MANUAL_ERASE = 'MANUAL_ERASE',
  BACKGROUND_COLOR = 'BACKGROUND_COLOR',
  BACKGROUND_AI = 'BACKGROUND_AI',
}

export type Theme = 'light' | 'dark';

export interface Point {
  x: number;
  y: number;
}