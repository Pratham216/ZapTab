import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, spacing } from "../theme";

import ZapTabWordmark from "./ZapTabWordmark";

interface AnimatedSplashScreenProps {
  isReady: boolean;
  onDismiss: () => void;
}

const { width } = Dimensions.get("window");

export default function AnimatedSplashScreen({
  isReady,
  onDismiss,
}: AnimatedSplashScreenProps) {
  // Animation values
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslateY = useRef(new Animated.Value(12)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  // Track timer vs readiness
  const timerFinishedRef = useRef(false);
  const isReadyRef = useRef(isReady);
  isReadyRef.current = isReady;

  const handleExit = useRef(() => {
    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: 380,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  }).current;

  useEffect(() => {
    // 1. Smooth, cinematic entrance sequence
    Animated.parallel([
      // Logo spring and fade in
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 35,
        useNativeDriver: true,
      }),
      // Brand text slides up and fades in
      Animated.sequence([
        Animated.delay(350),
        Animated.parallel([
          Animated.timing(brandOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(brandTranslateY, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Tagline fades in
      Animated.sequence([
        Animated.delay(750),
        Animated.timing(tagOpacity, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 2. Display duration: 3.0 seconds
    const timer = setTimeout(() => {
      timerFinishedRef.current = true;
      if (isReadyRef.current) {
        handleExit();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [brandOpacity, brandTranslateY, handleExit, logoOpacity, logoScale, tagOpacity]);

  // If app became ready after timer finished, exit immediately
  useEffect(() => {
    if (isReady && timerFinishedRef.current) {
      handleExit();
    }
  }, [handleExit, isReady]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { opacity: containerOpacity },
      ]}
      pointerEvents={isReady && timerFinishedRef.current ? "none" : "auto"}
    >
      <View style={styles.centerContent}>
        {/* Animated ZapTab Real Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require("../../assets/zaptab-logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Brand Name */}
        <Animated.View
          style={[
            styles.brandWrapper,
            {
              opacity: brandOpacity,
              transform: [{ translateY: brandTranslateY }],
            },
          ]}
        >
          <ZapTabWordmark size="xl" />
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={[styles.tagWrapper, { opacity: tagOpacity }]}>
          <Text style={styles.tagline}>SCAN • SPLIT • SETTLE</Text>
        </Animated.View>
      </View>

      {/* Footer subtle brand mark */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Instant UPI Bill Splitting</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0A0A0A",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  logoImage: {
    width: 110,
    height: 110,
  },
  brandWrapper: {
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  tagWrapper: {
    marginTop: spacing.xs,
  },
  tagline: {
    fontSize: 11,
    letterSpacing: 3,
    color: "#888891",
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: "#4A4A52",
    fontWeight: "500",
    letterSpacing: 0.5,
  },
});
