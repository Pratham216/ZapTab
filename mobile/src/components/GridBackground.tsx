import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Defs, Line, Pattern, Rect } from "react-native-svg";
import { colors } from "../theme";

const GRID_SIZE = 80;

export default function GridBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <Pattern
            id="appGrid"
            width={GRID_SIZE}
            height={GRID_SIZE}
            patternUnits="userSpaceOnUse"
          >
            <Line
              x1={0}
              y1={0}
              x2={0}
              y2={GRID_SIZE}
              stroke="rgba(255, 255, 255, 0.055)"
              strokeWidth={1}
            />
            <Line
              x1={0}
              y1={0}
              x2={GRID_SIZE}
              y2={0}
              stroke="rgba(255, 255, 255, 0.055)"
              strokeWidth={1}
            />
          </Pattern>
        </Defs>
        <Rect width={width} height={height} fill={colors.background} />
        <Rect width={width} height={height} fill="url(#appGrid)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});
