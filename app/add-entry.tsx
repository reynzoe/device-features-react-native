import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
    PinchGestureHandler,
    State as GestureState,
    type PinchGestureHandlerGestureEvent,
    type PinchGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { useTheme } from '../context/ThemeContext';
import { addEntry } from '../utils/storage';
import {
    requestNotificationPermission,
    sendEntrySavedNotification,
} from '../utils/notifications';
import { TravelEntry } from '../types';
import EarthPatternBackground from '../components/EarthPatternBackground';
import styles, { cameraFillStyle } from '../styles/screens/addEntryStyles';

type ScreenPhase = 'camera' | 'confirm' | 'preview' | 'saving';

const DEFAULT_ENTRY_TITLE = 'Travel Photo';
const DEFAULT_BACK_LENS = 'builtInWideAngleCamera';
const MAX_PINCH_ZOOM = 0.65;
const PINCH_SENSITIVITY = 0.22;
const IOS_KEYBOARD_OFFSET = 96;

const clampZoom = (value: number) => Math.min(Math.max(value, 0), MAX_PINCH_ZOOM);

export default function AddEntryScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const navigation = useNavigation();
    const cameraRef = useRef<CameraView>(null);
    const editLockRef = useRef(false);
    const descriptionInputRef = useRef<TextInput>(null);
    const pinchStartZoomRef = useRef(0);

    const [camPermission, requestCamPermission] = useCameraPermissions();

    const [phase, setPhase] = useState<ScreenPhase>('camera');
    const [facing, setFacing] = useState<CameraType>('back');
    const [zoom, setZoom] = useState(0);
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
        setZoom(0);
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

    const handleHeaderBackToHome = useCallback(() => {
        router.back();
    }, [router]);

    useLayoutEffect(() => {
        const showHeaderBack = phase === 'confirm' || phase === 'preview' || phase === 'saving';

        navigation.setOptions({
            headerLeft: showHeaderBack
                ? () => (
                    <TouchableOpacity
                        onPress={handleHeaderBackToHome}
                        style={styles.headerBackButton}
                        accessibilityLabel="Back to home"
                        activeOpacity={0.75}
                    >
                        <Feather name="chevron-left" size={22} color={colors.text} />
                    </TouchableOpacity>
                )
                : () => null,
        });
    }, [colors.text, handleHeaderBackToHome, navigation, phase]);

    const handleLeaveWithoutSaving = useCallback(() => {
        router.back();
    }, [router]);

    const handleToggleFacing = useCallback(() => {
        setZoom(0);
        setFacing((currentFacing) => (currentFacing === 'back' ? 'front' : 'back'));
    }, []);

    const handlePinchStateChange = useCallback(
        ({ nativeEvent }: PinchGestureHandlerStateChangeEvent) => {
            if (nativeEvent.state === GestureState.BEGAN) {
                pinchStartZoomRef.current = zoom;
            }

            if (
                nativeEvent.state === GestureState.END ||
                nativeEvent.state === GestureState.CANCELLED ||
                nativeEvent.state === GestureState.FAILED
            ) {
                pinchStartZoomRef.current = zoom;
            }
        },
        [zoom]
    );

    const handlePinchGesture = useCallback(
        ({ nativeEvent }: PinchGestureHandlerGestureEvent) => {
            if (facing !== 'back') {
                return;
            }

            const nextZoom = clampZoom(
                pinchStartZoomRef.current + (nativeEvent.scale - 1) * PINCH_SENSITIVITY
            );
            setZoom(nextZoom);
        },
        [facing]
    );

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
                setPhase('confirm');
            } else {
                Alert.alert('Error', 'Could not capture photo. Please try again.');
            }
        } catch {
            Alert.alert('Error', 'Camera failed. Please try again.');
        } finally {
            setSnapping(false);
        }
    };

    const handleSelectPhoto = async () => {
        if (!photoUri) return;
        setPhase('preview');
        await fetchAddress();
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

            router.back();
        } catch {
            setPhase('preview');
            Alert.alert('Save Failed', 'Could not save entry. Please try again.');
        }
    };

    if (!camPermission) {
        return (
            <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
                <EarthPatternBackground />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!camPermission.granted) {
        return (
            <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
                <EarthPatternBackground />
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

    if (phase === 'confirm' && photoUri) {
        return (
            <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
                <EarthPatternBackground />
                <ScrollView
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
                            <Image source={{ uri: photoUri }} style={styles.previewImg} resizeMode="contain" />
                            <View style={styles.previewShade} />
                            <View style={[styles.capturedBadge, { backgroundColor: colors.primary }]}>
                                <Text style={styles.capturedBadgeText}>CAPTURED</Text>
                            </View>
                        </View>

                        <View style={styles.previewFooter}>
                            <View style={styles.previewCopy}>
                                <Text style={[styles.previewTitle, { color: colors.text }]}>Use This Photo?</Text>
                                <Text style={[styles.previewSub, { color: colors.textSecondary }]}>
                                    Retake another shot or select this one to continue with your entry.
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[
                                styles.retakeBtn,
                                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                            ]}
                            onPress={clearDraft}
                            disabled={snapping}
                        >
                            <Text style={[styles.retakeBtnText, { color: colors.textSecondary }]}>Retake</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                            onPress={handleSelectPhoto}
                            disabled={snapping}
                        >
                            <Text style={styles.saveBtnText}>Select Photo</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.discardHint, { color: colors.textMuted }]}>
                        The address will be added automatically after you select this photo.
                    </Text>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (phase === 'preview' || phase === 'saving') {
        const isSaving = phase === 'saving';

        return (
            <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
                <EarthPatternBackground />
                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? IOS_KEYBOARD_OFFSET : 0}
                >
                    <ScrollView
                        bounces={false}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                        automaticallyAdjustKeyboardInsets
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
                                    <Text style={[styles.previewTitle, { color: colors.text }]}>
                                        Preview Your Memory
                                    </Text>
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
                            <Text style={[styles.sectionKicker, { color: colors.primary }]}>
                                CAPTURED LOCATION
                            </Text>

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
                                        { backgroundColor: isDark ? '#4A342E' : '#F8E7DD' },
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
                                blurOnSubmit={false}
                                onSubmitEditing={() => descriptionInputRef.current?.focus()}
                            />

                            <View style={styles.descriptionHeader}>
                                <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
                                <Text style={[styles.charCount, { color: colors.textMuted }]}>
                                    {description.length}/220
                                </Text>
                            </View>

                            <TextInput
                                ref={descriptionInputRef}
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
                                returnKeyType="done"
                                scrollEnabled={false}
                            />

                            <Text style={[styles.detailHint, { color: colors.textMuted }]}>
                                Leave the title blank and Wanderly will save it as Travel Photo.
                            </Text>
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[
                                    styles.saveBtn,
                                    styles.singleActionButton,
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
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    return (
        <PinchGestureHandler
            onGestureEvent={handlePinchGesture}
            onHandlerStateChange={handlePinchStateChange}
        >
            <View style={[styles.flex, { backgroundColor: '#000' }]}>
                <CameraView
                    ref={cameraRef}
                    style={cameraFillStyle}
                    facing={facing}
                    zoom={zoom}
                    selectedLens={facing === 'back' ? DEFAULT_BACK_LENS : undefined}
                />

                <SafeAreaView style={styles.camTopBar}>
                    <TouchableOpacity style={styles.camOverlayBtn} onPress={handleLeaveWithoutSaving}>
                        <Text style={styles.camBtnTxt}>Close</Text>
                    </TouchableOpacity>

                    <Text style={styles.camLabel}>WANDERLY CAMERA</Text>

                    <TouchableOpacity style={styles.camOverlayBtn} onPress={handleToggleFacing}>
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
                    <Text style={styles.camHint}>
                        {facing === 'back' ? 'Tap to capture' : 'Tap to capture a selfie memory'}
                    </Text>
                </View>
            </View>
        </PinchGestureHandler>
    );
}
