import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, StatusBar, Animated, Easing } from 'react-native';
import { ICONS } from '../icons';

const HOLD_MS = 3500; // total time the splash stays up before onFinish

/**
 * App-open splash: solid brand-orange, full screen, the real logo centred and
 * simply fading/scaling in (no crop tricks — those were rendering incorrectly
 * on-device). Calls onFinish after a fixed ~3.5s hold.
 */
export default function SplashScreen({ onFinish }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 450, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => onFinish && onFinish(), HOLD_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.wrap}>
      <StatusBar barStyle="light-content" backgroundColor="#F9B402" />
      <Animated.Image
        source={ICONS.logoWhite}
        resizeMode="contain"
        style={[styles.logo, { opacity, transform: [{ scale }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#F9B402',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 220, height: 60 },
});
