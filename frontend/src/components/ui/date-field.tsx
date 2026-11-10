import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import {
  control,
  palette,
  radius,
  space,
  type as typography,
} from "@/constants/theme";

export const formatDateForApi = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const applyDateSelection = (
  current: string,
  eventType: DateTimePickerEvent["type"],
  date?: Date,
) => (eventType === "set" && date ? formatDateForApi(date) : current);
const parseDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(1990, 0, 1);
};

export function DateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setOpen(false);
    onChange(applyDateSelection(value, event.type, date));
  };
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Abre el selector de fecha"
        onPress={() => setOpen(true)}
        style={[styles.control, error && styles.errorBorder]}
      >
        <MaterialCommunityIcons
          name="calendar-month-outline"
          size={21}
          color={palette.textMuted}
        />
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value || "Seleccionar fecha"}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={21}
          color={palette.textMuted}
        />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {open ? (
        <DateTimePicker
          value={parseDate(value)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  label: { color: palette.navy, ...typography.label },
  control: {
    minHeight: control.minHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
  },
  value: { flex: 1, color: palette.text, fontSize: 16 },
  placeholder: { color: palette.textSoft },
  errorBorder: { borderColor: palette.danger },
  error: { color: palette.danger, ...typography.caption },
});
