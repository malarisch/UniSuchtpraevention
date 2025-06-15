/**
 * Shared TypeScript interfaces used across the project.
 */
export interface SongAnalysis {
  substance: string;
  wortwahl: number;
  perspektive: number;
  kontext: number;
  hauefigkeit: number;
  songId?: number;
  sysPromptVer?: number;
}

export interface Substances {
  substances: SongAnalysis[];
}
