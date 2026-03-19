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
    background: '#FFF4EE',
    surface: '#FFFDFC',
    surfaceElevated: '#FFE7DA',
    primary: '#F26F5C',
    primaryLight: '#FFD8CD',
    text: '#2F1E1A',
    textSecondary: '#6E524A',
    textMuted: '#AA8A81',
    border: '#F4D6CC',
    borderLight: '#FBEAE4',
    danger: '#CD4B41',
    success: '#3E9B72',
};

const darkColors: ThemeColors = {
    background: '#221816',
    surface: '#2D211E',
    surfaceElevated: '#382925',
    primary: '#FF9A82',
    primaryLight: '#5A342C',
    text: '#FFF1EB',
    textSecondary: '#E7CCC2',
    textMuted: '#B89C94',
    border: '#4B3732',
    borderLight: '#382724',
    danger: '#FF8C7F',
    success: '#70CCA0',
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
