import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

type AnimatedSplashProps = {
  onFinish: () => void;
};

export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  // Store onFinish in a ref so animation never reruns if parent re-renders
  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(350),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 320,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    sequence.start(({ finished }) => {
      if (finished) onFinishRef.current();
    });

    return () => sequence.stop();
  // Run only once on mount — onFinishRef handles updates without re-running
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <View style={styles.logoWrap}>
        <Animated.Image
          source={require('../assets/images/splash-icon.png')}
          style={[
            styles.logo,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  logoWrap: {
    width: 176,
    height: 176,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
