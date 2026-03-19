import React from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { TravelEntry } from '../types';

interface Props {
    entry: TravelEntry;
    onRemove: () => void;
}

const fmt = (iso: string) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return { date, time };
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
                    shadowOpacity: isDark ? 0.3 : 0.07,
                },
            ]}
        >
            {/* Photo */}
            <Image source={{ uri: entry.imageUri }} style={styles.image} resizeMode="cover" />

            {/* Content */}
            <View style={styles.body}>
                {/* Address */}
                <View style={styles.addressRow}>
                    <Text style={styles.pin}>📍</Text>
                    <Text
                        style={[styles.address, { color: colors.text }]}
                        numberOfLines={2}
                    >
                        {entry.address}
                    </Text>
                </View>

                {/* Divider */}
                <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

                {/* Date + Remove */}
                <View style={styles.footer}>
                    <View>
                        <Text style={[styles.date, { color: colors.textSecondary }]}>{date}</Text>
                        <Text style={[styles.time, { color: colors.textMuted }]}>{time}</Text>
                    </View>

                    <TouchableOpacity
                        onPress={onRemove}
                        style={[
                            styles.removeBtn,
                            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                        ]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Text style={styles.removeIcon}>🗑️</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 10,
        elevation: 4,
    },
    image: {
        width: 112,
        height: 125,
    },
    body: {
        flex: 1,
        padding: 14,
        justifyContent: 'space-between',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 5,
    },
    pin: { fontSize: 14, marginTop: 1 },
    address: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
    },
    divider: {
        height: 1,
        marginVertical: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    date: { fontSize: 12, fontWeight: '600' },
    time: { fontSize: 11, marginTop: 2 },
    removeBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    removeIcon: { fontSize: 15 },
});