import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { TravelEntry } from '../types';
import styles from '../styles/components/entryCardStyles';

interface Props {
    entry: TravelEntry;
    onPress: () => void;
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
    entry.title?.trim() || 'Travel Photo';

const getSubtitle = (entry: TravelEntry) => entry.description?.trim() || '';

export default function EntryCard({ entry, onPress, onRemove }: Props) {
    const { colors, isDark } = useTheme();
    const { date, time } = fmt(entry.createdAt);

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.95}
            accessibilityLabel="View entry details"
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
            </View>
        </TouchableOpacity>
    );
}
