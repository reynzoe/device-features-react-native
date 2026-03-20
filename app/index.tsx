import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
    Modal,
    Image,
    ScrollView,
    useWindowDimensions,
    Animated,
    Easing,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { loadEntries, removeEntry, updateEntry } from '../utils/storage';
import { TravelEntry } from '../types';
import EntryCard from '../components/EntryCard';
import EarthPatternBackground from '../components/EarthPatternBackground';
import styles from '../styles/screens/homeStyles';

const DEFAULT_ENTRY_TITLE = 'Travel Photo';

const matchesSearch = (entry: TravelEntry, query: string) => {
    if (!query) return true;
    const haystack = [entry.title, entry.description, entry.address].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query);
};

const getEntryTitle = (entry: TravelEntry) => entry.title?.trim() || DEFAULT_ENTRY_TITLE;

const getEntryDescription = (entry: TravelEntry) =>
    entry.description?.trim() || 'No description added yet.';

const formatFullDate = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

export default function HomeScreen() {
    const { colors, theme, toggleTheme, isDark } = useTheme();
    const router = useRouter();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const [entries, setEntries] = useState<TravelEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchDraft, setSearchDraft] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEntry, setSelectedEntry] = useState<TravelEntry | null>(null);
    const [isEditingEntry, setIsEditingEntry] = useState(false);
    const [editTitleDraft, setEditTitleDraft] = useState('');
    const [editDescriptionDraft, setEditDescriptionDraft] = useState('');
    const [savingEntry, setSavingEntry] = useState(false);
    const [modalImageAspectRatio, setModalImageAspectRatio] = useState(1);
    const [isPhotoZoomVisible, setIsPhotoZoomVisible] = useState(false);
    const hasHydratedEntriesRef = useRef(false);
    const entriesSignatureRef = useRef('');
    const detailCardOpacity = useRef(new Animated.Value(0)).current;
    const detailCardTranslateY = useRef(new Animated.Value(16)).current;
    const detailCardScale = useRef(new Animated.Value(0.97)).current;
    const zoomOverlayOpacity = useRef(new Animated.Value(0)).current;
    const zoomImageScale = useRef(new Animated.Value(0.96)).current;

    useFocusEffect(
        useCallback(() => {
            let active = true;
            (async () => {
                const showInitialLoader = !hasHydratedEntriesRef.current;

                if (showInitialLoader) {
                    setLoading(true);
                }

                const data = await loadEntries();
                if (active) {
                    const nextSignature = JSON.stringify(data);

                    if (nextSignature !== entriesSignatureRef.current) {
                        entriesSignatureRef.current = nextSignature;
                        setEntries(data);
                    }

                    hasHydratedEntriesRef.current = true;

                    if (showInitialLoader) {
                        setLoading(false);
                    }
                }
            })();
            return () => {
                active = false;
            };
        }, [])
    );

    const applySearch = () => {
        setSearchQuery(searchDraft.trim().toLowerCase());
    };

    const filteredEntries = useMemo(
        () => entries.filter((entry) => matchesSearch(entry, searchQuery)),
        [entries, searchQuery]
    );
    const modalCardWidth = Math.min(Math.max(windowWidth - 56, 260), 360);
    const modalImageHeight = Math.min(modalCardWidth / Math.max(modalImageAspectRatio, 0.75), 320);
    const zoomImageWidth = windowWidth - 24;
    const zoomImageHeight = Math.min(
        zoomImageWidth / Math.max(modalImageAspectRatio, 0.45),
        windowHeight - 120
    );

    useEffect(() => {
        if (!selectedEntry) {
            setModalImageAspectRatio(1);
            return;
        }

        let cancelled = false;

        Image.getSize(
            selectedEntry.imageUri,
            (width, height) => {
                if (!cancelled && width > 0 && height > 0) {
                    setModalImageAspectRatio(width / height);
                }
            },
            () => {
                if (!cancelled) {
                    setModalImageAspectRatio(1);
                }
            }
        );

        return () => {
            cancelled = true;
        };
    }, [selectedEntry]);

    useEffect(() => {
        if (!selectedEntry) return;

        detailCardOpacity.setValue(0);
        detailCardTranslateY.setValue(16);
        detailCardScale.setValue(0.97);

        Animated.parallel([
            Animated.timing(detailCardOpacity, {
                toValue: 1,
                duration: 240,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(detailCardTranslateY, {
                toValue: 0,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(detailCardScale, {
                toValue: 1,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [selectedEntry, detailCardOpacity, detailCardScale, detailCardTranslateY]);

    useEffect(() => {
        if (!isPhotoZoomVisible) {
            zoomOverlayOpacity.setValue(0);
            zoomImageScale.setValue(0.96);
            return;
        }

        zoomOverlayOpacity.setValue(0);
        zoomImageScale.setValue(0.96);

        Animated.parallel([
            Animated.timing(zoomOverlayOpacity, {
                toValue: 1,
                duration: 220,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(zoomImageScale, {
                toValue: 1,
                duration: 240,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [isPhotoZoomVisible, zoomImageScale, zoomOverlayOpacity]);

    const sectionMeta = searchQuery
        ? `${filteredEntries.length} match${filteredEntries.length === 1 ? '' : 'es'}`
        : entries.length === 0
          ? 'No Entries yet'
          : `${entries.length} total`;

    const openEntryDetails = (entry: TravelEntry) => {
        setSelectedEntry(entry);
        setEditTitleDraft(getEntryTitle(entry));
        setEditDescriptionDraft(entry.description?.trim() || '');
        setIsEditingEntry(false);
    };

    const closeEntryDetails = () => {
        setSelectedEntry(null);
        setIsEditingEntry(false);
        setIsPhotoZoomVisible(false);
        setSavingEntry(false);
        setEditTitleDraft('');
        setEditDescriptionDraft('');
    };

    const startEditingEntry = () => {
        if (!selectedEntry) return;
        setEditTitleDraft(getEntryTitle(selectedEntry));
        setEditDescriptionDraft(selectedEntry.description?.trim() || '');
        setIsEditingEntry(true);
    };

    const cancelEditingEntry = () => {
        if (!selectedEntry) return;
        setEditTitleDraft(getEntryTitle(selectedEntry));
        setEditDescriptionDraft(selectedEntry.description?.trim() || '');
        setIsEditingEntry(false);
    };

    const saveEntryEdits = async () => {
        if (!selectedEntry) return;

        setSavingEntry(true);
        try {
            const updatedEntries = await updateEntry(selectedEntry.id, {
                title: editTitleDraft.trim() || DEFAULT_ENTRY_TITLE,
                description: editDescriptionDraft.trim(),
            });

            entriesSignatureRef.current = JSON.stringify(updatedEntries);
            setEntries(updatedEntries);

            const updatedSelectedEntry = updatedEntries.find((entry) => entry.id === selectedEntry.id) || null;
            setSelectedEntry(updatedSelectedEntry);
            setIsEditingEntry(false);
        } catch {
            Alert.alert('Update Failed', 'Could not update this entry. Please try again.');
        } finally {
            setSavingEntry(false);
        }
    };

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
                            entriesSignatureRef.current = JSON.stringify(updated);
                            setEntries(updated);
                            if (selectedEntry?.id === id) {
                                closeEntryDetails();
                            }
                        } catch {
                            Alert.alert('Error', 'Could not delete entry. Please try again.');
                        }
                    },
                },
            ]
        );
    };

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
                    accessibilityLabel="Search entries"
                >
                    <Feather name="search" size={20} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <View style={styles.sectionRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Entries</Text>
                <Text style={[styles.sectionMeta, { color: colors.textMuted }]}>{sectionMeta}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <EarthPatternBackground />

            <View style={styles.toolbarWrap}>
                <View style={styles.toolbarRow}>
                    <Text style={[styles.toolbarBrand, { color: colors.text }]}>Wanderly</Text>

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

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredEntries}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <EntryCard
                            entry={item}
                            onPress={() => openEntryDetails(item)}
                            onRemove={() => handleRemove(item.id)}
                        />
                    )}
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
                <Feather name="camera" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <Modal
                visible={!!selectedEntry}
                transparent
                animationType="fade"
                onRequestClose={closeEntryDetails}
            >
                <View style={styles.modalOverlay}>
                    <ScrollView
                        style={styles.modalScroll}
                        contentContainerStyle={styles.modalScrollContent}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Animated.View
                            style={[
                                styles.modalCard,
                                {
                                    width: modalCardWidth,
                                    backgroundColor: colors.surface,
                                    borderColor: colors.border,
                                    shadowOpacity: isDark ? 0.34 : 0.14,
                                    opacity: detailCardOpacity,
                                    transform: [{ translateY: detailCardTranslateY }, { scale: detailCardScale }],
                                },
                            ]}
                        >
                            {selectedEntry ? (
                                <>
                                    <View style={styles.modalMediaWrap}>
                                        <TouchableOpacity
                                            onPress={() => setIsPhotoZoomVisible(true)}
                                            activeOpacity={0.94}
                                            accessibilityLabel="Open photo zoom"
                                            >
                                                <Image
                                                    source={{ uri: selectedEntry.imageUri }}
                                                    style={[styles.modalImage, { height: modalImageHeight }]}
                                                    resizeMode="cover"
                                                />
                                            </TouchableOpacity>
                                        <View style={styles.photoHintWrap}>
                                            <View style={styles.photoHintChip}>
                                                <Text style={styles.photoHintText}>Tap photo to view fully</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            style={[
                                                styles.modalCloseButton,
                                                { backgroundColor: isDark ? 'rgba(32,24,22,0.86)' : 'rgba(255,255,255,0.9)' },
                                            ]}
                                            onPress={closeEntryDetails}
                                            activeOpacity={0.88}
                                        >
                                            <Text style={[styles.modalCloseText, { color: colors.text }]}>Close</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.modalBody}>
                                        <Text style={[styles.modalLocation, { color: colors.primary }]}>
                                            {selectedEntry.address}
                                        </Text>

                                        {isEditingEntry ? (
                                            <>
                                                <Text style={[styles.modalLabel, { color: colors.text }]}>Title</Text>
                                                <TextInput
                                                    value={editTitleDraft}
                                                    onChangeText={setEditTitleDraft}
                                                    placeholder={DEFAULT_ENTRY_TITLE}
                                                    placeholderTextColor={colors.textMuted}
                                                    style={[
                                                        styles.modalInput,
                                                        {
                                                            color: colors.text,
                                                            backgroundColor: colors.background,
                                                            borderColor: colors.borderLight,
                                                        },
                                                    ]}
                                                />

                                                <Text style={[styles.modalLabel, { color: colors.text }]}>Description</Text>
                                                <TextInput
                                                    value={editDescriptionDraft}
                                                    onChangeText={(value) => setEditDescriptionDraft(value.slice(0, 220))}
                                                    placeholder="Add a short note about this memory"
                                                    placeholderTextColor={colors.textMuted}
                                                    style={[
                                                        styles.modalTextArea,
                                                        {
                                                            color: colors.text,
                                                            backgroundColor: colors.background,
                                                            borderColor: colors.borderLight,
                                                        },
                                                    ]}
                                                    multiline
                                                    textAlignVertical="top"
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <Text style={[styles.modalTitle, { color: colors.text }]}>
                                                    {getEntryTitle(selectedEntry)}
                                                </Text>
                                                <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                                                    {getEntryDescription(selectedEntry)}
                                                </Text>
                                            </>
                                        )}

                                        <Text style={[styles.modalMeta, { color: colors.textMuted }]}>
                                            {formatFullDate(selectedEntry.createdAt)}
                                        </Text>

                                        <View style={styles.modalActions}>
                                            {isEditingEntry ? (
                                                <>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.modalSecondaryButton,
                                                            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                                                        ]}
                                                        onPress={cancelEditingEntry}
                                                        disabled={savingEntry}
                                                    >
                                                        <Text style={[styles.modalSecondaryText, { color: colors.textSecondary }]}>
                                                            Cancel
                                                        </Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={[styles.modalPrimaryButton, { backgroundColor: colors.primary }]}
                                                        onPress={saveEntryEdits}
                                                        disabled={savingEntry}
                                                    >
                                                        {savingEntry ? (
                                                            <ActivityIndicator size="small" color="#FFF" />
                                                        ) : (
                                                            <Text style={styles.modalPrimaryText}>Save Changes</Text>
                                                        )}
                                                    </TouchableOpacity>
                                                </>
                                            ) : (
                                                <TouchableOpacity
                                                    style={[styles.modalPrimaryButton, { backgroundColor: colors.primary }]}
                                                    onPress={startEditingEntry}
                                                >
                                                    <Text style={styles.modalPrimaryText}>Edit Entry</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                </>
                            ) : null}
                        </Animated.View>
                    </ScrollView>

                    {selectedEntry && isPhotoZoomVisible ? (
                        <Animated.View style={[styles.zoomOverlay, { opacity: zoomOverlayOpacity }]}>
                            <ScrollView
                                style={styles.zoomScroll}
                                contentContainerStyle={styles.zoomScrollContent}
                                maximumZoomScale={4}
                                minimumZoomScale={1}
                                showsHorizontalScrollIndicator={false}
                                showsVerticalScrollIndicator={false}
                                centerContent
                            >
                                <Animated.View style={{ transform: [{ scale: zoomImageScale }] }}>
                                    <Image
                                        source={{ uri: selectedEntry.imageUri }}
                                        style={[styles.zoomImage, { width: zoomImageWidth, height: zoomImageHeight }]}
                                        resizeMode="contain"
                                    />
                                </Animated.View>
                            </ScrollView>

                            <TouchableOpacity
                                style={[
                                    styles.zoomCloseButton,
                                    { backgroundColor: isDark ? 'rgba(32,24,22,0.92)' : 'rgba(255,255,255,0.92)' },
                                ]}
                                onPress={() => setIsPhotoZoomVisible(false)}
                                activeOpacity={0.9}
                            >
                                <Text style={[styles.zoomCloseText, { color: colors.text }]}>Done</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    ) : null}
                </View>
            </Modal>

        </SafeAreaView>
    );
}
