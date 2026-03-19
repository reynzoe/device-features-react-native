import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { loadEntries, removeEntry } from '../utils/storage';
import { requestNotificationPermission, sendTestNotification } from '../utils/notifications';
import { TravelEntry } from '../types';
import EntryCard from '../components/EntryCard';

export default function HomeScreen() {
    const { colors, isDark, toggleTheme, theme } = useTheme();
    const router = useRouter();
    const [entries, setEntries] = useState<TravelEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [testPending, setTestPending] = useState(false);

    // Reload list every time the screen comes into focus (e.g. after saving)
    useFocusEffect(
        useCallback(() => {
            let active = true;
            (async () => {
                setLoading(true);
                const data = await loadEntries();
                if (active) {
                    setEntries(data);
                    setLoading(false);
                }
            })();
            return () => {
                active = false;
            };
        }, [])
    );

    const handleRemove = (id: string) => {
        Alert.alert(
            'Delete Entry',
            'Are you sure you want to remove this travel memory?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const updated = await removeEntry(id);
                            setEntries(updated);
                        } catch {
                            Alert.alert('Error', 'Could not delete entry. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleTestNotification = async () => {
        try {
            const granted = await requestNotificationPermission();
            if (!granted) {
                Alert.alert('Notifications Off', 'Please allow notifications first, then try again.');
                return;
            }

            setTestPending(true);
            await sendTestNotification(2);
            Alert.alert(
                'Test Scheduled',
                'The notification will fire in 2 seconds. Press the Home button or lock your phone now and listen for the sound.'
            );
            setTimeout(() => {
                setTestPending(false);
            }, 2500);
        } catch {
            setTestPending(false);
            Alert.alert('Test Failed', 'Could not send the test notification.');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* ── Custom Header ─────────────────────────────────── */}
            <View
                style={[
                    styles.header,
                    { backgroundColor: colors.surface, borderBottomColor: colors.border },
                ]}
            >
                <View>
                    <Text style={[styles.headerEyebrow, { color: colors.primary }]}>MY</Text>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Travel Diary</Text>
                </View>

                <TouchableOpacity
                    onPress={toggleTheme}
                    style={[
                        styles.themeToggle,
                        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    ]}
                    accessibilityLabel={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                    <Text style={styles.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
                </TouchableOpacity>
            </View>

            {/* ── Stats strip ───────────────────────────────────── */}
            {entries.length > 0 && (
                <View style={[styles.statsStrip, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.statsText, { color: colors.textMuted }]}>
                        {entries.length} {entries.length === 1 ? 'memory' : 'memories'} captured
                    </Text>
                    <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                </View>
            )}

            <View style={styles.testActionWrap}>
                <TouchableOpacity
                    style={[
                        styles.testAction,
                        testPending
                            ? { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                            : { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={handleTestNotification}
                    activeOpacity={0.85}
                    disabled={testPending}
                >
                    <Text
                        style={[
                            styles.testActionText,
                            { color: testPending ? colors.primary : colors.text },
                        ]}
                    >
                        {testPending ? 'Notification Scheduled...' : 'Test Notification Sound'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ── Content ───────────────────────────────────────── */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : entries.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>🗺️</Text>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Entries Yet</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        Start capturing your travel memories.{'\n'}Tap the{' '}
                        <Text style={{ color: colors.primary, fontWeight: '700' }}>+</Text> button to add your
                        first entry.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={entries}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <EntryCard entry={item} onRemove={() => handleRemove(item.id)} />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                />
            )}

            {/* ── FAB ───────────────────────────────────────────── */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/add-entry')}
                activeOpacity={0.85}
                accessibilityLabel="Add new travel entry"
            >
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 16 : 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    headerEyebrow: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 4,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    themeToggle: {
        width: 46,
        height: 46,
        borderRadius: 23,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    themeIcon: { fontSize: 20 },
    // Stats
    statsStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 10,
    },
    statsText: { fontSize: 12, fontWeight: '500', letterSpacing: 0.3 },
    dot: { width: 5, height: 5, borderRadius: 3 },
    testActionWrap: {
        paddingHorizontal: 16,
        paddingTop: 14,
    },
    testAction: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        alignItems: 'center',
    },
    testActionText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    // Empty
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyEmoji: { fontSize: 72, marginBottom: 22 },
    emptyTitle: { fontSize: 22, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
    emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 23 },
    // List
    listContent: { padding: 16, paddingBottom: 110 },
    // FAB
    fab: {
        position: 'absolute',
        bottom: 34,
        right: 24,
        width: 62,
        height: 62,
        borderRadius: 31,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 14,
        elevation: 10,
    },
    fabIcon: { fontSize: 30, color: '#FFF', fontWeight: '300', marginTop: -2 },
});
