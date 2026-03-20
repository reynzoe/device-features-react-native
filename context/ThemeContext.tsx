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
    background: '#FFF4EC',
    surface: '#FFFDF9',
    surfaceElevated: '#F7E7DB',
    primary: '#D96C4A',
    primaryLight: '#F7D6CA',
    text: '#2B2522',
    textSecondary: '#6E5A51',
    textMuted: '#A18D84',
    border: '#EFD7CA',
    borderLight: '#F8E9E0',
    danger: '#C95A3B',
    success: '#3F7C85',
};

const darkColors: ThemeColors = {
    background: '#1F1D22',
    surface: '#2A262C',
    surfaceElevated: '#353038',
    primary: '#F0A27E',
    primaryLight: '#5A4038',
    text: '#FFF2EB',
    textSecondary: '#DCC9BF',
    textMuted: '#AD9E97',
    border: '#4A3F41',
    borderLight: '#3B3235',
    danger: '#FF9A80',
    success: '#6FA6AE',
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
