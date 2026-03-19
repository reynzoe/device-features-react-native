export interface TravelEntry {
    id: string;
    imageUri: string;
    title?: string;
    description?: string;
    address: string;
    latitude: number;
    longitude: number;
    createdAt: string; // ISO 8601
}

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
    background: string;
    surface: string;
    surfaceElevated: string;
    primary: string;
    primaryLight: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    borderLight: string;
    danger: string;
    success: string;
}
