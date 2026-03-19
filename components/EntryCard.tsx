import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { TravelEntry } from '../types';

interface Props {
    entry: TravelEntry;
    onRemove: () => void;
}

const fmt = (iso: string) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return { date, time };
};

const getEntryTitle = (entry: TravelEntry) =>
    entry.title?.trim() || entry.address.split(',')[0]?.trim() || 'Untitled memory';

const getEntryDescription = (entry: TravelEntry) =>
    entry.description?.trim() || 'A quiet stop worth remembering.';

export default function EntryCard({ entry, onRemove }: Props) {
    const { colors, isDark } = useTheme();
    const { date, time } = fmt(entry.createdAt);

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    shadowOpacity: isDark ? 0.26 : 0.1,
                },
            ]}
        >
            <View style={styles.mediaWrap}>
                <Image source={{ uri: entry.imageUri }} style={styles.image} resizeMode="cover" />
                <View style={styles.imageOverlay} />
                <View
                    style={[
                        styles.dateChip,
                        { backgroundColor: isDark ? 'rgba(34,24,22,0.84)' : 'rgba(255,253,251,0.9)' },
                    ]}
                >
                    <Text style={[styles.dateChipText, { color: colors.text }]}>{date}</Text>
                </View>

                <View style={styles.heroCopy}>
                    <Text style={styles.heroTitle} numberOfLines={2}>
                        {getEntryTitle(entry)}
                    </Text>
                    <Text style={styles.heroSubtitle} numberOfLines={1}>
                        {entry.address}
                    </Text>
                </View>
            </View>

            <View style={styles.body}>
                <View style={styles.copyBlock}>
                    <Text style={[styles.kicker, { color: colors.primary }]}>TRAVEL NOTE</Text>
                    <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
                        {getEntryDescription(entry)}
                    </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

                <View style={styles.footer}>
                    <View style={styles.metaBlock}>
                        <Text style={[styles.locationLabel, { color: colors.textMuted }]}>Location</Text>
                        <Text style={[styles.locationValue, { color: colors.text }]} numberOfLines={1}>
                            {entry.address}
                        </Text>
                    </View>

                    <View style={styles.metaBlock}>
                        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Saved</Text>
                        <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{time}</Text>
                    </View>

                    <TouchableOpacity
                        onPress={onRemove}
                        style={[
                            styles.removeBtn,
                            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                        ]}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.removeText, { color: colors.danger }]}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#101820',
        shadowOffset: { width: 0, height: 12 },
        shadowRadius: 24,
        elevation: 4,
    },
    mediaWrap: {
        position: 'relative',
    },
    image: {
        width: '100%',
        height: 176,
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(29, 17, 13, 0.28)',
    },
    dateChip: {
        position: 'absolute',
        left: 16,
        top: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
    },
    dateChipText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    heroCopy: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 16,
        gap: 4,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        lineHeight: 28,
        fontWeight: '800',
    },
    heroSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '600',
    },
    body: {
        padding: 16,
    },
    copyBlock: {
        gap: 10,
    },
    kicker: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.4,
    },
    description: {
        fontSize: 15,
        lineHeight: 23,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        marginVertical: 14,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 14,
        flexWrap: 'wrap',
    },
    metaBlock: {
        gap: 5,
        flexShrink: 1,
    },
    locationLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    locationValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    metaLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    metaValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    removeBtn: {
        minWidth: 88,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
    },
    removeText: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
});
