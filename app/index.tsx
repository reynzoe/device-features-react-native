import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    ImageBackground,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { loadEntries, removeEntry } from '../utils/storage';
import { TravelEntry } from '../types';
import EntryCard from '../components/EntryCard';

const formatChipLabel = (address: string) => address.split(',')[0]?.trim() || 'Destination';

const formatFullDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

const getEntryTitle = (entry: TravelEntry) =>
    entry.title?.trim() || formatChipLabel(entry.address) || 'Untitled memory';

const getEntryDescription = (entry: TravelEntry) =>
    entry.description?.trim() || entry.address;

export default function HomeScreen() {
    const { colors, theme, toggleTheme } = useTheme();
    const router = useRouter();
    const [entries, setEntries] = useState<TravelEntry[]>([]);
    const [loading, setLoading] = useState(true);

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
            'Remove this travel memory from your journal?',
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

    const latestEntry = entries[0];
    const chips = ['All', ...Array.from(new Set(entries.slice(0, 6).map((entry) => formatChipLabel(entry.address))))];

    const header = (
        <View style={styles.headerWrap}>
            <View style={styles.topBar}>
                <View style={styles.brandWrap}>
                    <Text style={[styles.brand, { color: colors.text }]}>Wanderly</Text>
                    {entries.length > 0 ? (
                        <View
                            style={[
                                styles.countPill,
                                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                            ]}
                        >
                            <Text style={[styles.countPillText, { color: colors.textSecondary }]}>
                                {entries.length} memories
                            </Text>
                        </View>
                    ) : null}
                </View>

                <TouchableOpacity
                    onPress={toggleTheme}
                    style={[
                        styles.modeToggle,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.modeToggleText, { color: colors.textSecondary }]}>
                        {theme === 'light' ? 'Night' : 'Day'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
            >
                {chips.map((chip, index) => {
                    const active = index === 0;
                    return (
                        <View
                            key={`${chip}-${index}`}
                            style={[
                                styles.chip,
                                active
                                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                                    : { backgroundColor: colors.surface, borderColor: colors.border },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    { color: active ? '#FFFFFF' : colors.textSecondary },
                                ]}
                            >
                                {chip}
                            </Text>
                        </View>
                    );
                })}
            </ScrollView>

            {latestEntry ? (
                <ImageBackground
                    source={{ uri: latestEntry.imageUri }}
                    style={styles.featureCard}
                    imageStyle={styles.featureImage}
                >
                    <View style={styles.featureOverlay} />
                    <View style={styles.featureBody}>
                        <View style={styles.featureTag}>
                            <Text style={styles.featureTagText}>Featured Memory</Text>
                        </View>

                        <Text style={styles.featureTitle} numberOfLines={2}>
                            {getEntryTitle(latestEntry)}
                        </Text>
                        <Text style={styles.featureSubtitle} numberOfLines={2}>
                            {getEntryDescription(latestEntry)}
                        </Text>

                        <View style={styles.featureMetaRow}>
                            <View style={styles.featureMetaBlock}>
                                <Text style={styles.featureMetaLabel}>{formatChipLabel(latestEntry.address)}</Text>
                                <Text style={styles.featureMetaValue}>
                                    {formatFullDate(latestEntry.createdAt)}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.featureAction}
                                onPress={() => router.push('/add-entry')}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.featureActionText}>Capture</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ImageBackground>
            ) : (
                <View
                    style={[
                        styles.emptyFeature,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                >
                    <Text style={[styles.emptyFeatureKicker, { color: colors.primary }]}>Fresh Journal</Text>
                    <Text style={[styles.emptyFeatureTitle, { color: colors.text }]}>Your next photo becomes a story.</Text>
                    <Text style={[styles.emptyFeatureBody, { color: colors.textSecondary }]}>
                        Save a place, add a title, and keep a short note for each trip.
                    </Text>
                </View>
            )}

            <View style={styles.sectionRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Entries</Text>
                <Text style={[styles.sectionMeta, { color: colors.textMuted }]}>
                    {entries.length === 0 ? 'No entries yet' : `${entries.length} total`}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : entries.length === 0 ? (
                <View style={styles.emptyShell}>{header}</View>
            ) : (
                <FlatList
                    data={entries}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <EntryCard entry={item} onRemove={() => handleRemove(item.id)} />}
                    ListHeaderComponent={header}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}

            <TouchableOpacity
                style={[styles.floatingCta, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/add-entry')}
                activeOpacity={0.92}
                accessibilityLabel="Add travel entry"
            >
                <Text style={styles.floatingCtaText}>Add Entry</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyShell: {
        flex: 1,
        paddingHorizontal: 18,
        paddingTop: 10,
    },
    listContent: {
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 108,
    },
    headerWrap: {
        marginBottom: 4,
    },
    separator: {
        height: 18,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 14,
    },
    brandWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flexShrink: 1,
    },
    brand: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -1,
    },
    countPill: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
    },
    countPillText: {
        fontSize: 12,
        fontWeight: '700',
    },
    modeToggle: {
        minWidth: 78,
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
    },
    modeToggleText: {
        fontSize: 12,
        fontWeight: '700',
    },
    chipsRow: {
        paddingBottom: 16,
        gap: 10,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 18,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    featureCard: {
        height: 208,
        borderRadius: 30,
        overflow: 'hidden',
        marginBottom: 18,
        justifyContent: 'flex-end',
        backgroundColor: '#D2A291',
    },
    featureImage: {
        borderRadius: 30,
    },
    featureOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(35, 20, 17, 0.34)',
    },
    featureBody: {
        paddingHorizontal: 20,
        paddingVertical: 18,
        gap: 10,
    },
    featureTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    featureTagText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    featureTitle: {
        color: '#FFFFFF',
        fontSize: 28,
        lineHeight: 32,
        fontWeight: '800',
        maxWidth: '84%',
    },
    featureSubtitle: {
        color: 'rgba(255,255,255,0.92)',
        fontSize: 14,
        lineHeight: 21,
        maxWidth: '92%',
    },
    featureMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 12,
        marginTop: 2,
    },
    featureMetaBlock: {
        gap: 2,
        flex: 1,
    },
    featureMetaLabel: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    featureMetaValue: {
        color: 'rgba(255,255,255,0.84)',
        fontSize: 12,
        fontWeight: '600',
    },
    featureAction: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.24)',
    },
    featureActionText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    emptyFeature: {
        borderRadius: 28,
        borderWidth: 1,
        padding: 22,
        marginBottom: 18,
    },
    emptyFeatureKicker: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.4,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    emptyFeatureTitle: {
        fontSize: 24,
        lineHeight: 30,
        fontWeight: '800',
        marginBottom: 10,
    },
    emptyFeatureBody: {
        fontSize: 14,
        lineHeight: 22,
    },
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    sectionMeta: {
        fontSize: 13,
        fontWeight: '600',
    },
    floatingCta: {
        position: 'absolute',
        right: 18,
        bottom: 24,
        minWidth: 118,
        height: 52,
        paddingHorizontal: 20,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#F26F5C',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
        elevation: 5,
    },
    floatingCtaText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
});
