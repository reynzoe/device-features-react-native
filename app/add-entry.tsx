import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { addEntry } from '../utils/storage';
import {
    requestNotificationPermission,
    sendEntrySavedNotification,
} from '../utils/notifications';
import { TravelEntry } from '../types';

type ScreenPhase = 'camera' | 'preview' | 'saving';

export default function AddEntryScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const navigation = useNavigation();
    const cameraRef = useRef<CameraView>(null);

    const [camPermission, requestCamPermission] = useCameraPermissions();

    const [phase, setPhase] = useState<ScreenPhase>('camera');
    const [facing, setFacing] = useState<CameraType>('back');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [address, setAddress] = useState('');
    const [coords, setCoords] = useState({ lat: 0, lng: 0 });
    const [locLoading, setLocLoading] = useState(false);
    const [locError, setLocError] = useState<string | null>(null);
    const [snapping, setSnapping] = useState(false);

    // ── Reset whenever the screen comes back into focus ──────────────────────
    const clearDraft = useCallback(() => {
        setPhase('camera');
        setFacing('back');
        setPhotoUri(null);
        setAddress('');
        setCoords({ lat: 0, lng: 0 });
        setLocLoading(false);
        setLocError(null);
        setSnapping(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            clearDraft();
        }, [clearDraft])
    );

    useEffect(() => {
        return navigation.addListener('beforeRemove', () => {
            clearDraft();
        });
    }, [clearDraft, navigation]);

    const handleLeaveWithoutSaving = useCallback(() => {
        clearDraft();
        router.back();
    }, [clearDraft, router]);

    // ── Get reverse-geocoded address ──────────────────────────────────────────
    const fetchAddress = async () => {
        setLocLoading(true);
        setLocError(null);

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                setLocError('Location permission denied.');
                setAddress('Address unavailable');
                setLocLoading(false);
                return;
            }

            const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });

            const [geo] = await Location.reverseGeocodeAsync({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            });

            if (geo) {
                const parts = [
                    geo.name,
                    geo.street,
                    geo.city ?? geo.district,
                    geo.region,
                    geo.country,
                ].filter(Boolean);
                setAddress(parts.slice(0, 3).join(', ') || 'Unknown location');
            } else {
                setAddress('Unknown location');
            }
        } catch {
            setLocError('Could not determine location.');
            setAddress('Location unavailable');
        } finally {
            setLocLoading(false);
        }
    };

    // ── Take photo ────────────────────────────────────────────────────────────
    const takePicture = async () => {
        if (!cameraRef.current || snapping) return;
        setSnapping(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
            if (photo?.uri) {
                setPhotoUri(photo.uri);
                setPhase('preview');
                await fetchAddress();
            } else {
                Alert.alert('Error', 'Could not capture photo. Please try again.');
            }
        } catch {
            Alert.alert('Error', 'Camera failed. Please try again.');
        } finally {
            setSnapping(false);
        }
    };

    // ── Save entry ────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!photoUri) {
            Alert.alert('No Photo', 'Please take a photo before saving.');
            return;
        }
        if (locLoading) {
            Alert.alert('Please Wait', 'Still retrieving your location...');
            return;
        }

        setPhase('saving');

        try {
            const entry: TravelEntry = {
                id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                imageUri: photoUri,
                address: address || 'Unknown location',
                latitude: coords.lat,
                longitude: coords.lng,
                createdAt: new Date().toISOString(),
            };

            await addEntry(entry);

            try {
                const notifOk = await requestNotificationPermission();
                if (notifOk) {
                    await sendEntrySavedNotification(entry.address);
                }
            } catch (notificationError) {
                console.warn('[notifications] entry saved, but local notification failed:', notificationError);
            }

            router.back();
        } catch {
            setPhase('preview');
            Alert.alert('Save Failed', 'Could not save entry. Please try again.');
        }
    };

    // ── Waiting for permission status ─────────────────────────────────────────
    if (!camPermission) {
        return (
            <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    // ── Permission denied ─────────────────────────────────────────────────────
    if (!camPermission.granted) {
        return (
            <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
                <View style={styles.permissionBox}>
                    <Text style={styles.permEmoji}>📷</Text>
                    <Text style={[styles.permTitle, { color: colors.text }]}>Camera Required</Text>
                    <Text style={[styles.permSub, { color: colors.textSecondary }]}>
                        Travel Diary needs camera access to capture your memories.
                    </Text>
                    <TouchableOpacity
                        style={[styles.permBtn, { backgroundColor: colors.primary }]}
                        onPress={requestCamPermission}
                    >
                        <Text style={styles.permBtnText}>Grant Camera Access</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.cancelBtn, { borderColor: colors.border }]}
                        onPress={handleLeaveWithoutSaving}
                    >
                        <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ── Preview / Saving ──────────────────────────────────────────────────────
    if (phase === 'preview' || phase === 'saving') {
        const isSaving = phase === 'saving';

        return (
            <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
                <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                    {/* Photo */}
                    <View>
                        <Image source={{ uri: photoUri! }} style={styles.previewImg} resizeMode="cover" />
                        <View style={[styles.capturedBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.capturedBadgeText}>CAPTURED</Text>
                        </View>
                    </View>

                    {/* Location card */}
                    <View
                        style={[
                            styles.locCard,
                            {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                shadowOpacity: isDark ? 0.2 : 0.05,
                            },
                        ]}
                    >
                        <View style={styles.locCardHeader}>
                            <Text style={[styles.locLabel, { color: colors.textSecondary }]}>📍 LOCATION</Text>
                            {locLoading && (
                                <View style={styles.locLoadingRow}>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                    <Text style={[styles.locLoadingText, { color: colors.textMuted }]}>
                                        Fetching address…
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Error banner */}
                        {locError && !locLoading && (
                            <View
                                style={[
                                    styles.errorBanner,
                                    { backgroundColor: isDark ? '#3B1515' : '#FEF2F2' },
                                ]}
                            >
                                <Text style={[styles.errorText, { color: colors.danger }]}>⚠️ {locError}</Text>
                            </View>
                        )}

                        {/* Address text */}
                        {!locLoading && address ? (
                            <Text style={[styles.addressText, { color: colors.text }]}>{address}</Text>
                        ) : null}

                        {/* Timestamp */}
                        <Text style={[styles.tsText, { color: colors.textMuted }]}>
                            🕐{' '}
                            {new Date().toLocaleString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </Text>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[
                                styles.retakeBtn,
                                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                            ]}
                            onPress={clearDraft}
                            disabled={isSaving}
                        >
                            <Text style={[styles.retakeBtnText, { color: colors.textSecondary }]}>
                                ↩ Retake
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.saveBtn,
                                { backgroundColor: colors.primary },
                                (isSaving || locLoading) && styles.saveBtnDisabled,
                            ]}
                            onPress={handleSave}
                            disabled={isSaving || locLoading}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.saveBtnText}>Save Entry ✓</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.discardHint, { color: colors.textMuted }]}>
                        Going back without saving discards this entry and clears the form.
                    </Text>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // ── Camera view ───────────────────────────────────────────────────────────
    return (
        <View style={[styles.flex, { backgroundColor: '#000' }]}>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

            {/* Top controls */}
            <SafeAreaView style={styles.camTopBar}>
                <TouchableOpacity style={styles.camOverlayBtn} onPress={handleLeaveWithoutSaving}>
                    <Text style={styles.camBtnTxt}>‹ Back</Text>
                </TouchableOpacity>

                <Text style={styles.camLabel}>CAPTURE MOMENT</Text>

                <TouchableOpacity
                    style={styles.camOverlayBtn}
                    onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                >
                    <Text style={styles.camBtnTxt}>⇄ Flip</Text>
                </TouchableOpacity>
            </SafeAreaView>

            {/* Grid overlay hint */}
            <View style={styles.camGuide} pointerEvents="none">
                <View style={[styles.camGuideCorner, styles.camGuideCornerTL]} />
                <View style={[styles.camGuideCorner, styles.camGuideCornerTR]} />
                <View style={[styles.camGuideCorner, styles.camGuideCornerBL]} />
                <View style={[styles.camGuideCorner, styles.camGuideCornerBR]} />
            </View>

            {/* Shutter */}
            <View style={styles.shutterRow}>
                <View style={styles.shutterRing}>
                    <TouchableOpacity
                        style={[styles.shutterBtn, snapping && { opacity: 0.7 }]}
                        onPress={takePicture}
                        disabled={snapping}
                    >
                        {snapping && <ActivityIndicator size="small" color="#1C1917" />}
                    </TouchableOpacity>
                </View>
                <Text style={styles.camHint}>Tap to capture</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // ── Permission ─────────────────────────────────────────────────────────────
    permissionBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    permEmoji: { fontSize: 64, marginBottom: 20 },
    permTitle: { fontSize: 22, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
    permSub: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
    permBtn: {
        width: '100%',
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 12,
    },
    permBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    cancelBtn: {
        width: '100%',
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
    },
    cancelBtnText: { fontWeight: '600', fontSize: 15 },
    discardHint: {
        marginTop: 14,
        marginBottom: 28,
        paddingHorizontal: 24,
        textAlign: 'center',
        fontSize: 13,
        lineHeight: 19,
    },

    // ── Camera ─────────────────────────────────────────────────────────────────
    camTopBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    camOverlayBtn: {
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 22,
    },
    camBtnTxt: { color: '#FFF', fontWeight: '600', fontSize: 14 },
    camLabel: {
        color: 'rgba(255,255,255,0.65)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2.5,
    },
    // Framing guides
    camGuide: {
        position: 'absolute',
        top: '20%',
        left: '8%',
        right: '8%',
        bottom: '20%',
    },
    camGuideCorner: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderColor: 'rgba(255,255,255,0.55)',
    },
    camGuideCornerTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
    camGuideCornerTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
    camGuideCornerBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
    camGuideCornerBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
    // Shutter
    shutterRow: {
        position: 'absolute',
        bottom: 52,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    shutterRing: {
        width: 84,
        height: 84,
        borderRadius: 42,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    shutterBtn: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    camHint: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '500' },

    // ── Preview ────────────────────────────────────────────────────────────────
    previewImg: { width: '100%', height: 340 },
    capturedBadge: {
        position: 'absolute',
        top: 16,
        right: 16,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    capturedBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    locCard: {
        margin: 16,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 3,
    },
    locCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    locLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
    locLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    locLoadingText: { fontSize: 12 },
    errorBanner: { borderRadius: 10, padding: 10, marginBottom: 10 },
    errorText: { fontSize: 13, fontWeight: '500' },
    addressText: { fontSize: 16, fontWeight: '600', lineHeight: 24, marginBottom: 10 },
    tsText: { fontSize: 13, marginTop: 2 },

    // ── Actions ────────────────────────────────────────────────────────────────
    actions: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    retakeBtn: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
    },
    retakeBtnText: { fontSize: 15, fontWeight: '600' },
    saveBtn: {
        flex: 2,
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 5,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
