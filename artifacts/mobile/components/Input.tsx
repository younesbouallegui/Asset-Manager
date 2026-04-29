import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

type IconName = React.ComponentProps<typeof Feather>["name"];

interface InputProps extends TextInputProps {
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle | ViewStyle[];
}

export function Input({
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  ...rest
}: InputProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderColor: focused ? colors.primary : colors.border,
        },
        containerStyle,
      ]}
    >
      {leftIcon ? (
        <Feather
          name={leftIcon}
          size={18}
          color={colors.mutedForeground}
          style={{ marginRight: 10 }}
        />
      ) : null}
      <TextInput
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          { color: colors.onSurface, fontFamily: "Inter_400Regular" },
          style,
        ]}
      />
      {rightIcon ? (
        <Pressable hitSlop={10} onPress={onRightIconPress}>
          <Feather
            name={rightIcon}
            size={18}
            color={colors.mutedForeground}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
});
