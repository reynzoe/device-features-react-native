import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { setupNotificationChannel } from '../utils/notifications';

function LayoutContent() {
    const { colors, theme } = useTheme();

    useEffect(() => {
        setupNotificationChannel();
    }, []);

    return (
        <>
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: colors.surface },
                    headerTintColor: colors.text,
                    headerTitleStyle: { fontWeight: '700', fontSize: 17 },
                    contentStyle: { backgroundColor: colors.background },
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                }}
            >
                {/* Home — custom header rendered inside the screen */}
                <Stack.Screen name="index" options={{ headerShown: false }} />

                {/* Add Entry */}
                <Stack.Screen
                    name="add-entry"
                    options={{
                        title: 'New Memory',
                        headerStyle: { backgroundColor: colors.surface },
                        headerTintColor: colors.text,
                    }}
                />
            </Stack>
        </>
    );
}

export default function RootLayout() {
    return (
        <ThemeProvider>
            <LayoutContent />
        </ThemeProvider>
    );
}
