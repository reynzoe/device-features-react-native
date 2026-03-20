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
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return { date, time };
};

const splitAddress = (address: string) =>
    address
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

const cleanPlacePart = (part: string) =>
    part
        .replace(/\b\d{4,}\b/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

const getLocationPill = (address: string) => {
    const parts = splitAddress(address);
    const preferred = parts
        .map(cleanPlacePart)
        .find((part) => /[A-Za-z]/.test(part));

    return preferred || cleanPlacePart(parts[0] || '') || 'Saved place';
};

const getEntryTitle = (entry: TravelEntry) =>
    entry.title?.trim() || getLocationPill(entry.address) || 'Untitled memory';

const getSubtitle = (entry: TravelEntry) => entry.description?.trim() || '';

const getRegionTag = (address: string) => {
    const parts = splitAddress(address);
    return cleanPlacePart(parts[parts.length - 1] || parts[0] || 'Trip') || 'Trip';
};

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
                    shadowOpacity: isDark ? 0.22 : 0.08,
                },
            ]}
        >
            <View style={styles.mediaWrap}>
                <Image source={{ uri: entry.imageUri }} style={styles.image} resizeMode="cover" />
                <View style={styles.imageTint} />

                <View
                    style={[
                        styles.locationChip,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.22)' },
                    ]}
                >
                    <Text style={styles.locationChipText} numberOfLines={1}>
                        {'📍 '}
                        {getLocationPill(entry.address)}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={onRemove}
                    style={[
                        styles.removeIcon,
                        { backgroundColor: isDark ? 'rgba(35, 23, 18, 0.34)' : 'rgba(255,255,255,0.2)' },
                    ]}
                    activeOpacity={0.88}
                    accessibilityLabel="Remove entry"
                >
                    <Text style={styles.removeIconText}>X</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.contentRow}>
                <Image source={{ uri: entry.imageUri }} style={styles.thumb} resizeMode="cover" />

                <View style={styles.copyWrap}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                        {getEntryTitle(entry)}
                    </Text>
                    {getSubtitle(entry) ? (
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                            {getSubtitle(entry)}
                        </Text>
                    ) : null}
                    <Text style={[styles.locationLine, { color: colors.textSecondary }]} numberOfLines={1}>
                        {entry.address}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                        {date} · {time}
                    </Text>
                </View>

                <View style={[styles.regionTag, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.regionTagText, { color: colors.primary }]} numberOfLines={1}>
                        {getRegionTag(entry.address)}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#120B09',
        shadowOffset: { width: 0, height: 12 },
        shadowRadius: 24,
        elevation: 4,
    },
    mediaWrap: {
        position: 'relative',
    },
    image: {
        width: '100%',
        height: 214,
    },
    imageTint: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(35, 20, 17, 0.18)',
    },
    locationChip: {
        position: 'absolute',
        left: 16,
        top: 16,
        maxWidth: '68%',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    locationChipText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    removeIcon: {
        position: 'absolute',
        right: 16,
        top: 16,
        width: 44,
        height: 44,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
    },
    removeIconText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 18,
    },
    thumb: {
        width: 56,
        height: 56,
        borderRadius: 18,
    },
    copyWrap: {
        flex: 1,
        gap: 4,
    },
    title: {
        fontSize: 17,
        fontWeight: '900',
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    locationLine: {
        fontSize: 13,
        fontWeight: '700',
    },
    meta: {
        fontSize: 12,
        fontWeight: '600',
    },
    regionTag: {
        maxWidth: 92,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    regionTagText: {
        fontSize: 12,
        fontWeight: '800',
    },
});
