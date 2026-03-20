import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { loadEntries, removeEntry } from '../utils/storage';
import { TravelEntry } from '../types';
import EntryCard from '../components/EntryCard';

const splitAddress = (address: string) =>
    address
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

const matchesSearch = (entry: TravelEntry, query: string) => {
    if (!query) return true;
    const haystack = [entry.title, entry.description, entry.address].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query);
};

export default function HomeScreen() {
    const { colors, theme, toggleTheme } = useTheme();
    const router = useRouter();
    const [entries, setEntries] = useState<TravelEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchDraft, setSearchDraft] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

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

    const applySearch = () => {
        setSearchQuery(searchDraft.trim().toLowerCase());
    };

    const filteredEntries = entries.filter((entry) => matchesSearch(entry, searchQuery));
    const sectionMeta = searchQuery
        ? `${filteredEntries.length} match${filteredEntries.length === 1 ? '' : 'es'}`
        : entries.length === 0
          ? 'No Entries yet'
          : `${entries.length} total`;

    const header = (
        <View style={styles.headerWrap}>
            <View style={styles.searchRow}>
                <View
                    style={[
                        styles.searchField,
                        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    ]}
                >
                    <TextInput
                        value={searchDraft}
                        onChangeText={setSearchDraft}
                        onSubmitEditing={applySearch}
                        placeholder="Search memories..."
                        placeholderTextColor={colors.textMuted}
                        style={[styles.searchInput, { color: colors.text }]}
                        returnKeyType="search"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.searchButton, { backgroundColor: colors.primary }]}
                    onPress={applySearch}
                    activeOpacity={0.9}
                >
                    <Text style={styles.searchButtonText}>Search</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.sectionRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Entries</Text>
                <Text style={[styles.sectionMeta, { color: colors.textMuted }]}>{sectionMeta}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.toolbarWrap}>
                <View style={styles.toolbarRow}>
                    <Text style={[styles.toolbarBrand, { color: colors.text }]}>Wanderly</Text>

                    <View style={styles.toolbarActions}>
                        <TouchableOpacity
                            onPress={toggleTheme}
                            style={[
                                styles.modeToggle,
                                { backgroundColor: colors.surface, borderColor: colors.border },
                            ]}
                            activeOpacity={0.88}
                        >
                            <Text style={[styles.modeToggleText, { color: colors.textSecondary }]}>
                                {theme === 'light' ? 'Light' : 'Dark'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredEntries}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <EntryCard entry={item} onRemove={() => handleRemove(item.id)} />}
                    ListHeaderComponent={header}
                    ListEmptyComponent={
                        <View
                            style={[
                                styles.emptyState,
                                { backgroundColor: colors.surface, borderColor: colors.border },
                            ]}
                        >
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>
                                {searchQuery ? 'No matching entries' : 'No Entries yet'}
                            </Text>
                            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                                {searchQuery
                                    ? 'Try another title, place, or keyword.'
                                    : 'Take a photo and start building your travel diary.'}
                            </Text>
                        </View>
                    }
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    keyboardShouldPersistTaps="handled"
                />
            )}

            <TouchableOpacity
                style={[
                    styles.bottomCta,
                    { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => router.push('/add-entry')}
                activeOpacity={0.92}
                accessibilityLabel="Add travel entry"
            >
                <Text style={styles.bottomCtaPlus}>+</Text>
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
    toolbarWrap: {
        paddingHorizontal: 18,
        paddingTop: 6,
        paddingBottom: 8,
    },
    toolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    toolbarBrand: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.8,
    },
    toolbarActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    listContent: {
        paddingHorizontal: 18,
        paddingTop: 4,
        paddingBottom: 96,
    },
    separator: {
        height: 18,
    },
    headerWrap: {
        marginBottom: 18,
    },
    modeToggle: {
        minWidth: 82,
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
    },
    modeToggleText: {
        fontSize: 13,
        fontWeight: '700',
    },
    searchRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    searchField: {
        flex: 1,
        borderRadius: 22,
        borderWidth: 1,
        paddingHorizontal: 16,
        justifyContent: 'center',
        minHeight: 58,
    },
    searchInput: {
        fontSize: 16,
        fontWeight: '500',
    },
    searchButton: {
        minWidth: 96,
        paddingHorizontal: 18,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    sectionMeta: {
        fontSize: 13,
        fontWeight: '700',
    },
    emptyState: {
        borderRadius: 28,
        borderWidth: 1,
        paddingVertical: 28,
        paddingHorizontal: 24,
        alignItems: 'center',
        marginTop: 6,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 10,
    },
    emptyBody: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
    },
    bottomCta: {
        position: 'absolute',
        left: 18,
        bottom: 22,
        width: 58,
        height: 58,
        borderRadius: 29,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#F26F5C',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.2,
        shadowRadius: 22,
        elevation: 5,
    },
    bottomCtaPlus: {
        color: '#FFFFFF',
        fontSize: 24,
        lineHeight: 24,
        fontWeight: '800',
        marginTop: -2,
    },
});
