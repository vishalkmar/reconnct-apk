import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, StatusBar, Animated, Easing } from 'react-native';
import { ICONS } from '../icons';

const HOLD_MS = 3500; // total time the splash stays up before onFinish
const LOGO_W = 220;
const LOGO_H = 60;
const HALF_W = LOGO_W / 2;

/**
 * App-open splash: the logo's left half slides in from off-screen left, the
 * right half from off-screen right, meet in the centre, a quick tech-style
 * pulse ring fires at the merge point, then the full logo settles.
 *
 * IMPORTANT Android quirk this works around: applying `overflow:hidden` and a
 * `transform` to the SAME view is unreliable on Android (the clip doesn't
 * always follow), which is what made the previous attempt render as one huge
 * unclipped image. Fix: the transform lives on an OUTER wrapper with no
 * clipping; the clip lives on a separate INNER static view that never moves.
 */
export default function SplashScreen({ onFinish }) {
  const leftX = useRef(new Animated.Value(-160)).current;
  const rightX = useRef(new Animated.Value(160)).current;
  const pulseScale = useRef(new Animated.Value(0)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(leftX, { toValue: 0, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(rightX, { toValue: 0, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      // Merge moment: a quick expanding pulse ring (tech/futuristic flash) at centre.
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0.9, duration: 90, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]),
        Animated.timing(pulseScale, { toValue: 3, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(logoScale, { toValue: 1.08, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(logoScale, { toValue: 1, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ]),
    ]).start();

    const t = setTimeout(() => onFinish && onFinish(), HOLD_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.wrap}>
      <StatusBar barStyle="light-content" backgroundColor="#F9B402" />

      <View style={styles.stage}>
        {/* Tech pulse ring — fires right as the two halves meet */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulse,
            { opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
          ]}
        />

        <Animated.View style={[styles.logoRow, { transform: [{ scale: logoScale }] }]}>
          {/* Left half: outer view carries the slide-in transform (no clip here) */}
          <Animated.View style={{ transform: [{ translateX: leftX }] }}>
            <View style={styles.clip}>
              <Image source={ICONS.logoWhite} style={styles.fullImg} resizeMode="contain" />
            </View>
          </Animated.View>
          {/* Right half: same source image, shifted left so only its right half shows */}
          <Animated.View style={{ transform: [{ translateX: rightX }] }}>
            <View style={styles.clip}>
              <Image source={ICONS.logoWhite} style={[styles.fullImg, { marginLeft: -HALF_W }]} resizeMode="contain" />
            </View>
          </Animated.View>
        </Animated.View>
      </View>
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
  stage: { width: LOGO_W, height: LOGO_H, alignItems: 'center', justifyContent: 'center' },
  pulse: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },
  logoRow: { flexDirection: 'row', width: LOGO_W, height: LOGO_H },
  // Clip lives on a plain, never-animated View — this is the piece that keeps
  // Android's clipping reliable (see the note above the component).
  clip: { width: HALF_W, height: LOGO_H, overflow: 'hidden' },
  fullImg: { width: LOGO_W, height: LOGO_H },
});
