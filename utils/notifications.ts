import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Global handler — must be set at module level
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/** Call once on app startup (Android channel setup). */
export async function setupNotificationChannel(): Promise<void> {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('travel-diary', {
            name: 'Travel Diary',
            description: 'Notifications for saved travel entries',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#F59E0B',
            sound: 'default',
        });
    }
}

/** Request permission — returns whether granted. */
export async function requestNotificationPermission(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
}

/** Fire an immediate local notification when an entry is saved. */
export async function sendEntrySavedNotification(address: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: '✈️ Travel Entry Saved!',
            body: `📍 ${address}`,
            sound: 'default',
            data: { screen: 'home' },
            ...(Platform.OS === 'android' ? { channelId: 'travel-diary' } : {}),
        },
        trigger: null, // immediate
    });
}

/** Fire a test local notification to verify banner/sound behavior. */
export async function sendTestNotification(delaySeconds = 2): Promise<void> {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'Test Notification',
            body: 'If you hear a sound, local notification audio is working.',
            sound: 'default',
            data: { screen: 'home', type: 'test' },
            ...(Platform.OS === 'android' ? { channelId: 'travel-diary' } : {}),
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: delaySeconds,
        },
    });
}
