import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import styles from '../styles/components/earthPatternBackgroundStyles';

export default function EarthPatternBackground() {
    const { colors, isDark } = useTheme();
    const driftA = useRef(new Animated.Value(0)).current;
    const driftB = useRef(new Animated.Value(0)).current;
    const driftC = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loopA = Animated.loop(
            Animated.sequence([
                Animated.timing(driftA, {
                    toValue: 1,
                    duration: 18000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(driftA, {
                    toValue: 0,
                    duration: 18000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );

        const loopB = Animated.loop(
            Animated.sequence([
                Animated.timing(driftB, {
                    toValue: 1,
                    duration: 22000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(driftB, {
                    toValue: 0,
                    duration: 22000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );

        const loopC = Animated.loop(
            Animated.sequence([
                Animated.timing(driftC, {
                    toValue: 1,
                    duration: 26000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(driftC, {
                    toValue: 0,
                    duration: 26000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );

        loopA.start();
        loopB.start();
        loopC.start();

        return () => {
            loopA.stop();
            loopB.stop();
            loopC.stop();
        };
    }, [driftA, driftB, driftC]);

    const contourColor = isDark ? 'rgba(255, 242, 235, 0.08)' : 'rgba(43, 37, 34, 0.07)';
    const landColor = isDark ? 'rgba(240, 162, 126, 0.12)' : 'rgba(217, 108, 74, 0.1)';
    const seaColor = isDark ? 'rgba(111, 166, 174, 0.12)' : 'rgba(63, 124, 133, 0.08)';

    return (
        <View pointerEvents="none" style={styles.container}>
            <Animated.View
                style={[
                    styles.orbOne,
                    {
                        backgroundColor: colors.primaryLight,
                        opacity: isDark ? 0.28 : 0.62,
                        transform: [
                            {
                                translateX: driftA.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -12],
                                }),
                            },
                            {
                                translateY: driftA.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 10],
                                }),
                            },
                        ],
                    },
                ]}
            />

            <Animated.View
                style={[
                    styles.orbTwo,
                    {
                        backgroundColor: seaColor,
                        transform: [
                            {
                                translateX: driftB.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 18],
                                }),
                            },
                            {
                                translateY: driftB.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -14],
                                }),
                            },
                        ],
                    },
                ]}
            />

            <Animated.View
                style={[
                    styles.orbThree,
                    {
                        backgroundColor: colors.primaryLight,
                        opacity: isDark ? 0.12 : 0.36,
                        transform: [
                            {
                                translateY: driftC.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 12],
                                }),
                            },
                        ],
                    },
                ]}
            />

            <View style={[styles.landmassOne, { backgroundColor: landColor }]} />
            <View style={[styles.landmassTwo, { backgroundColor: landColor }]} />

            <Animated.View
                style={[
                    styles.contourOne,
                    {
                        borderColor: contourColor,
                        transform: [
                            {
                                rotate: driftA.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['-6deg', '2deg'],
                                }),
                            },
                        ],
                    },
                ]}
            />
            <Animated.View
                style={[
                    styles.contourTwo,
                    {
                        borderColor: contourColor,
                        transform: [
                            {
                                rotate: driftB.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['4deg', '-5deg'],
                                }),
                            },
                        ],
                    },
                ]}
            />
            <View style={[styles.contourThree, { borderColor: contourColor }]} />
            <View style={[styles.contourFour, { borderColor: contourColor }]} />
            <View style={[styles.latitudeBand, { borderColor: contourColor }]} />
            <View style={[styles.longitudeBand, { borderColor: contourColor }]} />
        </View>
    );
}
