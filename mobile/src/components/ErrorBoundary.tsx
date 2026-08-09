import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import Button from "../components/Button";
import { colors, fontSize, spacing, typography } from "../theme";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <ScreenContainer center>
          <View style={styles.container}>
            <Text style={typography.heading}>Something went wrong</Text>
            <Text style={[typography.body, styles.errorText]}>
              {this.state.error?.message || "An unexpected error occurred."}
            </Text>
            <Button
              label="Try again"
              onPress={this.handleReset}
              style={styles.button}
            />
          </View>
        </ScreenContainer>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  button: {
    minWidth: 160,
  },
});
