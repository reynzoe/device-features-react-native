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
        await Notifications.setNotificationChannelAsync('wanderly-journal', {
            name: 'Wanderly',
            description: 'Notifications for saved travel memories',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#D96C4A',
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
export async function sendEntrySavedNotification(title: string, address: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'Saved to Wanderly',
            body: `${title} is ready in your travel journal.`,
            sound: 'default',
            data: { screen: 'home', address },
            ...(Platform.OS === 'android' ? { channelId: 'wanderly-journal' } : {}),
        },
        trigger: null, // immediate
    });
}
