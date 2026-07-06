import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, StatusBar, Animated, Easing } from 'react-native';
import { ICONS } from '../icons';

// Real logo image is cropped into a left/right half by two overflow:hidden
// containers (not plain text) — each shows one half of the same source image.
const LOGO_W = 220;
const LOGO_H = Math.round((LOGO_W * 26) / 132); // matches the logo's own aspect ratio
const HALF_W = LOGO_W / 2;

/**
 * App-open splash. The logo image splits into two halves — the left half
 * slides in from off-screen left, the right half from off-screen right — meet
 * in the centre, then the merged logo pulses with a quick zoom. Calls
 * onFinish once the animation (plus a short hold) completes, so the caller
 * doesn't need a separate fixed timer.
 */
export default function SplashScreen({ onFinish }) {
  const leftX = useRef(new Animated.Value(-160)).current;
  const rightX = useRef(new Animated.Value(160)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(leftX, { toValue: 0, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(rightX, { toValue: 0, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.16, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start(() => {
      setTimeout(() => onFinish && onFinish(), 300);
    });
  }, []);

  return (
    <View style={styles.wrap}>
      <StatusBar barStyle="light-content" backgroundColor="#F9B402" />
      <Animated.View style={[styles.logoRow, { transform: [{ scale }], opacity }]}>
        <Animated.View style={[styles.half, { transform: [{ translateX: leftX }] }]}>
          <Image source={ICONS.logoWhite} style={styles.fullImg} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={[styles.half, { transform: [{ translateX: rightX }] }]}>
          <Image source={ICONS.logoWhite} style={[styles.fullImg, { marginLeft: -HALF_W }]} resizeMode="contain" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F9B402',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 999,
  },
  logoRow: { flexDirection: 'row', width: LOGO_W, height: LOGO_H },
  half: { width: HALF_W, height: LOGO_H, overflow: 'hidden' },
  fullImg: { width: LOGO_W, height: LOGO_H },
});
