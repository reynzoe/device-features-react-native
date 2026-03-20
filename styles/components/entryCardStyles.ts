import { StyleSheet } from 'react-native';

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
});

export default styles;
