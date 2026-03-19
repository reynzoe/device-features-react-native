import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, ThemeColors } from '../types';

// ── Palettes ─────────────────────────────────────────────────────────────────

const lightColors: ThemeColors = {
    background: '#FAF8F5',
    surface: '#FFFFFF',
    surfaceElevated: '#F3EFE8',
    primary: '#D97706',
    primaryLight: '#FEF3C7',
    text: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#A8A29E',
    border: '#E7E5E4',
    borderLight: '#F5F5F4',
    danger: '#DC2626',
    success: '#16A34A',
};

const darkColors: ThemeColors = {
    background: '#0C0A09',
    surface: '#1C1917',
    surfaceElevated: '#292524',
    primary: '#F59E0B',
    primaryLight: '#451A03',
    text: '#FAFAF9',
    textSecondary: '#A8A29E',
    textMuted: '#78716C',
    border: '#292524',
    borderLight: '#1C1917',
    danger: '#EF4444',
    success: '#22C55E',
};

// ── Context ───────────────────────────────────────────────────────────────────

interface ThemeContextType {
    theme: ThemeMode;
    isDark: boolean;
    colors: ThemeColors;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

const THEME_KEY = '@travel_diary_theme';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setTheme] = useState<ThemeMode>('light');

    useEffect(() => {
        (async () => {
            try {
                const saved = await AsyncStorage.getItem(THEME_KEY);
                if (saved === 'light' || saved === 'dark') setTheme(saved);
            } catch {}
        })();
    }, []);

    const toggleTheme = async () => {
        const next: ThemeMode = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        try {
            await AsyncStorage.setItem(THEME_KEY, next);
        } catch {}
    };

    return (
        <ThemeContext.Provider
            value={{
                theme,
                isDark: theme === 'dark',
                colors: theme === 'light' ? lightColors : darkColors,
                toggleTheme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
    return ctx;
};