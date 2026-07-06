import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, StatusBar, Animated, Easing } from 'react-native';

/**
 * App-open splash. The wordmark splits into two halves — "reco" slides in from
 * the left, "nnct" from the right — meet in the centre, then the merged logo
 * pulses with a quick zoom to sell the "snap together" moment. Calls onFinish
 * once the animation (plus a short hold) completes, so the caller doesn't need
 * a separate fixed timer.
 */
export default function SplashScreen({ onFinish }) {
  const leftX = useRef(new Animated.Value(-120)).current;
  const rightX = useRef(new Animated.Value(120)).current;
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
        <Animated.Text style={[styles.logoHalf, { transform: [{ translateX: leftX }] }]}>reco</Animated.Text>
        <Animated.Text style={[styles.logoHalf, { transform: [{ translateX: rightX }] }]}>nnct</Animated.Text>
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
  logoRow: { flexDirection: 'row' },
  logoHalf: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', letterSpacing: 0.5 },
});
