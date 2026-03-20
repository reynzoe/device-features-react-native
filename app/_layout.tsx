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
                    animation: 'slide_from_right',
                    gestureEnabled: true,
                    fullScreenGestureEnabled: true,
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
                        animation: 'fade_from_bottom',
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
