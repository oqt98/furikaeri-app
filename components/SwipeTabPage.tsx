import { useRouter } from 'expo-router';
import React, { ReactNode, useRef } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const TAB_ROUTES = {
  index: '/(tabs)',
  history: '/(tabs)/history',
  calendar: '/(tabs)/calendar',
  analytics: '/(tabs)/analytics',
  settings: '/(tabs)/settings',
} as const;

type TabKey = keyof typeof TAB_ROUTES;

type Props = {
  tabKey: TabKey;
  children: ReactNode;
};

const TAB_ORDER: TabKey[] = [
  'index',
  'history',
  'calendar',
  'analytics',
  'settings',
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DRAG_DAMPING = 0.35;
const DRAG_LIMIT = SCREEN_WIDTH * 0.22;
const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 700;
const EXIT_DISTANCE = SCREEN_WIDTH * 0.28;

export default function SwipeTabPage({ tabKey, children }: Props) {
  const router = useRouter();
  const movingRef = useRef(false);

  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const getNextTab = (direction: 'left' | 'right'): TabKey | null => {
    const currentIndex = TAB_ORDER.indexOf(tabKey);
    if (currentIndex === -1) return null;

    const nextIndex =
      direction === 'left' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) return null;

    return TAB_ORDER[nextIndex];
  };

  const resetPosition = () => {
    translateX.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
    scale.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  };

  const moveTab = (direction: 'left' | 'right') => {
    if (movingRef.current) return;

    const nextTab = getNextTab(direction);
    if (!nextTab) {
      resetPosition();
      return;
    }

    movingRef.current = true;

    const exitX = direction === 'left' ? -EXIT_DISTANCE : EXIT_DISTANCE;

    translateX.value = withTiming(exitX, {
      duration: 140,
      easing: Easing.out(Easing.cubic),
    });
    scale.value = withTiming(0.985, {
      duration: 140,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(0.9, {
      duration: 140,
      easing: Easing.out(Easing.cubic),
    });

    setTimeout(() => {
      router.replace(TAB_ROUTES[nextTab]);
    }, 120);

    setTimeout(() => {
      movingRef.current = false;
      translateX.value = 0;
      scale.value = 1;
      opacity.value = 1;
    }, 360);
  };

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onUpdate((event) => {
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);

      if (absX <= absY) return;

      const rawX = event.translationX * DRAG_DAMPING;
      const limitedX = Math.max(Math.min(rawX, DRAG_LIMIT), -DRAG_LIMIT);

      translateX.value = limitedX;

      const progress = Math.min(absX / 180, 1);
      scale.value = 1 - progress * 0.02;
      opacity.value = 1 - progress * 0.08;
    })
    .onEnd((event) => {
      const shouldGoLeft =
        event.translationX < -SWIPE_DISTANCE || event.velocityX < -SWIPE_VELOCITY;

      const shouldGoRight =
        event.translationX > SWIPE_DISTANCE || event.velocityX > SWIPE_VELOCITY;

      if (shouldGoLeft) {
        runOnJS(moveTab)('left');
        return;
      }

      if (shouldGoRight) {
        runOnJS(moveTab)('right');
        return;
      }

      resetPosition();
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      flex: 1,
      transform: [
        { translateX: translateX.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});