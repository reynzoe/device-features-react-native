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
    TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { addEntry } from '../utils/storage';
import {
    requestNotificationPermission,
    sendEntrySavedNotification,
} from '../utils/notifications';
import { TravelEntry } from '../types';

type ScreenPhase = 'camera' | 'preview' | 'saving';

const DEFAULT_ENTRY_TITLE = 'Travel Photo';

export default function AddEntryScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const navigation = useNavigation();
    const cameraRef = useRef<CameraView>(null);
    const editLockRef = useRef(false);

    const [camPermission, requestCamPermission] = useCameraPermissions();

    const [phase, setPhase] = useState<ScreenPhase>('camera');
    const [facing, setFacing] = useState<CameraType>('back');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [originalPhotoUri, setOriginalPhotoUri] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [coords, setCoords] = useState({ lat: 0, lng: 0 });
    const [locLoading, setLocLoading] = useState(false);
    const [locError, setLocError] = useState<string | null>(null);
    const [snapping, setSnapping] = useState(false);
    const [editingImage, setEditingImage] = useState(false);
    const [rotationAngle, setRotationAngle] = useState(0);

    const clearDraft = useCallback(() => {
        setPhase('camera');
        setFacing('back');
        setPhotoUri(null);
        setOriginalPhotoUri(null);
        setTitle('');
        setDescription('');
        setAddress('');
        setCoords({ lat: 0, lng: 0 });
        setLocLoading(false);
        setLocError(null);
        setSnapping(false);
        setEditingImage(false);
        setRotationAngle(0);
        editLockRef.current = false;
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

    const takePicture = async () => {
        if (!cameraRef.current || snapping) return;
        setSnapping(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
            if (photo?.uri) {
                setPhotoUri(photo.uri);
                setOriginalPhotoUri(photo.uri);
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

    const rotatePhoto = useCallback(async () => {
        if (!originalPhotoUri || editLockRef.current) return;

        const nextRotation = (rotationAngle + 90) % 360;
        setRotationAngle(nextRotation);

        if (nextRotation === 0) {
            setPhotoUri(originalPhotoUri);
            return;
        }

        editLockRef.current = true;
        setEditingImage(true);

        try {
            const result = await manipulateAsync(
                originalPhotoUri,
                [{ rotate: nextRotation }],
                {
                    compress: 0.92,
                    format: SaveFormat.JPEG,
                }
            );

            setPhotoUri(result.uri);
        } catch {
            Alert.alert('Edit Failed', 'Could not rotate the photo. Please try again.');
        } finally {
            editLockRef.current = false;
            setEditingImage(false);
        }
    }, [originalPhotoUri, rotationAngle]);

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
            const normalizedTitle = title.trim() || DEFAULT_ENTRY_TITLE;
            const normalizedDescription = description.trim();

            const entry: TravelEntry = {
                id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                imageUri: photoUri,
                title: normalizedTitle,
                description: normalizedDescription,
                address: address || 'Unknown location',
                latitude: coords.lat,
                longitude: coords.lng,
                createdAt: new Date().toISOString(),
            };

            await addEntry(entry);

            try {
                const notifOk = await requestNotificationPermission();
                if (notifOk) {
                    await sendEntrySavedNotification(entry.title || entry.address, entry.address);
                }
            } catch (notificationError) {
                console.warn('[notifications] entry saved, but local notification failed:', notificationError);
            }

            clearDraft();
            router.back();
        } catch {
            setPhase('preview');
            Alert.alert('Save Failed', 'Could not save entry. Please try again.');
        }
    };

    if (!camPermission) {
        return (
            <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!camPermission.granted) {
        return (
            <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
                <View style={styles.permissionBox}>
                    <Text style={[styles.permEyebrow, { color: colors.primary }]}>CAMERA ACCESS</Text>
                    <Text style={[styles.permTitle, { color: colors.text }]}>Camera Required</Text>
                    <Text style={[styles.permSub, { color: colors.textSecondary }]}>
                        Wanderly needs camera access to capture your memories.
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

    if (phase === 'preview' || phase === 'saving') {
        const isSaving = phase === 'saving';

        return (
            <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
                <ScrollView
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.previewContent}
                >
                    <View
                        style={[
                            styles.previewCard,
                            {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                shadowOpacity: isDark ? 0.26 : 0.08,
                            },
                        ]}
                    >
                        <View style={styles.previewFrame}>
                            <Image
                                source={{ uri: photoUri! }}
                                style={styles.previewImg}
                                resizeMode="contain"
                            />
                            <View style={styles.previewShade} />
                            <View style={[styles.capturedBadge, { backgroundColor: colors.primary }]}>
                                <Text style={styles.capturedBadgeText}>PHOTO READY</Text>
                            </View>
                        </View>

                        <View style={styles.previewFooter}>
                            <View style={styles.previewCopy}>
                                <Text style={[styles.previewTitle, { color: colors.text }]}>Preview Your Memory</Text>
                                <Text style={[styles.previewSub, { color: colors.textSecondary }]}>
                                    Rotate if needed, then add the details before saving.
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.rotateButton,
                                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                                ]}
                                onPress={rotatePhoto}
                                disabled={editingImage || isSaving}
                            >
                                {editingImage ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <Text style={[styles.rotateButtonText, { color: colors.textSecondary }]}>
                                        Rotate
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View
                        style={[
                            styles.infoCard,
                            {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                shadowOpacity: isDark ? 0.22 : 0.07,
                            },
                        ]}
                    >
                        <Text style={[styles.sectionKicker, { color: colors.primary }]}>CAPTURED LOCATION</Text>

                        {locLoading ? (
                            <View style={styles.locationStatus}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={[styles.locationStatusText, { color: colors.textMuted }]}>
                                    Fetching address...
                                </Text>
                            </View>
                        ) : null}

                        {locError && !locLoading ? (
                            <View
                                style={[
                                    styles.errorBanner,
                                    { backgroundColor: isDark ? '#4A2320' : '#FFF0EC' },
                                ]}
                            >
                                <Text style={[styles.errorText, { color: colors.danger }]}>{locError}</Text>
                            </View>
                        ) : null}

                        {!locLoading && address ? (
                            <Text style={[styles.addressText, { color: colors.text }]}>{address}</Text>
                        ) : null}

                        <Text style={[styles.tsText, { color: colors.textMuted }]}>
                            Captured{' '}
                            {new Date().toLocaleString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.infoCard,
                            {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                shadowOpacity: isDark ? 0.22 : 0.07,
                            },
                        ]}
                    >
                        <Text style={[styles.sectionKicker, { color: colors.primary }]}>MEMORY DETAILS</Text>

                        <Text style={[styles.inputLabel, { color: colors.text }]}>Title</Text>
                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Empire State Building in New York!"
                            placeholderTextColor={colors.textMuted}
                            style={[
                                styles.titleInput,
                                {
                                    color: colors.text,
                                    backgroundColor: colors.background,
                                    borderColor: colors.borderLight,
                                },
                            ]}
                            autoCapitalize="words"
                            returnKeyType="next"
                        />

                        <View style={styles.descriptionHeader}>
                            <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
                            <Text style={[styles.charCount, { color: colors.textMuted }]}>
                                {description.length}/220
                            </Text>
                        </View>

                        <TextInput
                            value={description}
                            onChangeText={(value) => setDescription(value.slice(0, 220))}
                            placeholder="What made this place memorable?"
                            placeholderTextColor={colors.textMuted}
                            style={[
                                styles.descriptionInput,
                                {
                                    color: colors.text,
                                    backgroundColor: colors.background,
                                    borderColor: colors.borderLight,
                                },
                            ]}
                            multiline
                            textAlignVertical="top"
                        />

                        <Text style={[styles.detailHint, { color: colors.textMuted }]}>
                            Leave the title blank and Wanderly will save it as Travel Photo.
                        </Text>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[
                                styles.retakeBtn,
                                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                            ]}
                            onPress={clearDraft}
                            disabled={isSaving || editingImage}
                        >
                            <Text style={[styles.retakeBtnText, { color: colors.textSecondary }]}>Retake</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.saveBtn,
                                { backgroundColor: colors.primary },
                                (isSaving || locLoading || editingImage) && styles.saveBtnDisabled,
                            ]}
                            onPress={handleSave}
                            disabled={isSaving || locLoading || editingImage}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.saveBtnText}>Save to Wanderly</Text>
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

    return (
        <View style={[styles.flex, { backgroundColor: '#000' }]}>
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

            <SafeAreaView style={styles.camTopBar}>
                <TouchableOpacity style={styles.camOverlayBtn} onPress={handleLeaveWithoutSaving}>
                    <Text style={styles.camBtnTxt}>Close</Text>
                </TouchableOpacity>

                <Text style={styles.camLabel}>WANDERLY CAMERA</Text>

                <TouchableOpacity
                    style={styles.camOverlayBtn}
                    onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                >
                    <Text style={styles.camBtnTxt}>Switch</Text>
                </TouchableOpacity>
            </SafeAreaView>

            <View style={styles.camGuide} pointerEvents="none">
                <View style={[styles.camGuideCorner, styles.camGuideCornerTL]} />
                <View style={[styles.camGuideCorner, styles.camGuideCornerTR]} />
                <View style={[styles.camGuideCorner, styles.camGuideCornerBL]} />
                <View style={[styles.camGuideCorner, styles.camGuideCornerBR]} />
            </View>

            <View style={styles.shutterRow}>
                <View style={styles.shutterRing}>
                    <TouchableOpacity
                        style={[styles.shutterBtn, snapping && { opacity: 0.7 }]}
                        onPress={takePicture}
                        disabled={snapping}
                    >
                        {snapping ? <ActivityIndicator size="small" color="#2F1E1A" /> : null}
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

    permissionBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    permEyebrow: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.8,
        marginBottom: 14,
    },
    permTitle: { fontSize: 22, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
    permSub: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
    permBtn: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#F26F5C',
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 18,
        shadowOpacity: 0.28,
        elevation: 5,
    },
    permBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 17,
        letterSpacing: 0.4,
    },
    cancelBtn: {
        width: '100%',
        paddingVertical: 15,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
    },
    cancelBtnText: { fontWeight: '600', fontSize: 15 },

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
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2.4,
    },
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
    camHint: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' },

    previewContent: {
        paddingTop: 16,
        paddingBottom: 32,
    },
    previewCard: {
        marginHorizontal: 16,
        borderRadius: 28,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#120B09',
        shadowOffset: { width: 0, height: 12 },
        shadowRadius: 26,
        elevation: 4,
    },
    previewFrame: {
        height: 360,
        backgroundColor: '#1E1715',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    previewImg: {
        width: '100%',
        height: '100%',
    },
    previewShade: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(35, 20, 17, 0.14)',
    },
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
    previewFooter: {
        paddingHorizontal: 18,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
    },
    previewCopy: {
        flex: 1,
        gap: 6,
    },
    previewTitle: {
        fontSize: 21,
        fontWeight: '800',
    },
    previewSub: {
        fontSize: 14,
        lineHeight: 20,
    },
    rotateButton: {
        minWidth: 96,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rotateButtonText: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    infoCard: {
        marginTop: 16,
        marginHorizontal: 16,
        borderRadius: 22,
        padding: 18,
        borderWidth: 1,
        shadowColor: '#120B09',
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 22,
        elevation: 4,
    },
    sectionKicker: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 14,
    },
    locationStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    locationStatusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    errorBanner: {
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
    },
    errorText: {
        fontSize: 13,
        fontWeight: '600',
    },
    addressText: {
        fontSize: 20,
        lineHeight: 28,
        fontWeight: '800',
        marginBottom: 12,
    },
    tsText: {
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '500',
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 9,
    },
    titleInput: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 18,
    },
    descriptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 9,
    },
    charCount: {
        fontSize: 12,
        fontWeight: '600',
    },
    descriptionInput: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 130,
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 12,
    },
    detailHint: {
        fontSize: 13,
        lineHeight: 19,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        marginTop: 18,
    },
    retakeBtn: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 18,
        alignItems: 'center',
        borderWidth: 1,
    },
    retakeBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
    saveBtn: {
        flex: 1.25,
        paddingVertical: 16,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#F26F5C',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
        elevation: 5,
    },
    saveBtnDisabled: {
        opacity: 0.72,
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    discardHint: {
        marginTop: 14,
        paddingHorizontal: 24,
        textAlign: 'center',
        fontSize: 13,
        lineHeight: 19,
    },
});
