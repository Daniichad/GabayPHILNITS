import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator } from 'react-native';

export default function BrandedLoader({ size = 110, showSpinner = true, backgroundColor = '#0f1e35' }) {
  const pulseAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Animated.Image
        source={require('../assets/initial.png')}
        style={[
          styles.logo,
          {
            width: size,
            height: size,
            opacity: pulseAnim,
            transform: [
              {
                scale: pulseAnim,
              },
            ],
          },
        ]}
        resizeMode="contain"
      />
      {showSpinner && (
        <ActivityIndicator size="small" color="#D9989E" style={styles.spinner} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    marginBottom: 16,
  },
  spinner: {
    marginTop: 8,
  },
});
