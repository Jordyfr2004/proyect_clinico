import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  control,
  elevation,
  palette,
  radius,
  space,
  type as typography,
} from "@/constants/theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
export type ScreenVariant = "auth" | "stack" | "tab";
export const getScreenBottomPadding = (
  variant: ScreenVariant,
  bottomInset: number,
) => (variant === "tab" ? space.md : bottomInset + space.md);

export function Screen({
  children,
  scroll = true,
  variant = "stack",
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  variant?: ScreenVariant;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const paddingBottom = getScreenBottomPadding(variant, insets.bottom);
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[styles.content, styles.fill, { paddingBottom }, contentStyle]}
    >
      {children}
    </View>
  );
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.authHeader}>
      <View style={styles.brandMark}>
        <MaterialCommunityIcons
          name="tooth-outline"
          size={38}
          color={palette.primary}
        />
      </View>
      <Text style={styles.authTitle}>{title}</Text>
      <Text style={styles.authSubtitle}>{subtitle}</Text>
    </View>
  );
}
export function AppHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.headerRow}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={10}
          onPress={onBack}
          style={styles.back}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={palette.navy}
          />
        </Pressable>
      ) : null}
      <View style={styles.headerText}>
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}
export function Title({
  children,
  subtitle,
}: {
  children: ReactNode;
  subtitle?: string;
}) {
  return <AppHeader title={String(children)} subtitle={subtitle} />;
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <Card>
      <View style={styles.sectionHeader}>
        {icon ? (
          <View style={styles.smallIcon}>
            <MaterialCommunityIcons
              name={icon}
              size={19}
              color={palette.primary}
            />
          </View>
        ) : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

export function Field({
  label,
  error,
  icon,
  rightIcon,
  onRightPress,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  icon?: IconName;
  rightIcon?: IconName;
  onRightPress?: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, error ? styles.inputError : null]}>
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={palette.textMuted}
          />
        ) : null}
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={palette.textSoft}
          style={styles.input}
          {...props}
        />
        {rightIcon && onRightPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              rightIcon.includes("off")
                ? "Mostrar contraseña"
                : "Ocultar contraseña"
            }
            hitSlop={8}
            onPress={onRightPress}
          >
            <MaterialCommunityIcons
              name={rightIcon}
              size={21}
              color={palette.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
export function PasswordField(
  props: Omit<
    ComponentProps<typeof Field>,
    "secureTextEntry" | "rightIcon" | "onRightPress"
  >,
) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...props}
      icon="lock-outline"
      secureTextEntry={!visible}
      rightIcon={visible ? "eye-outline" : "eye-off-outline"}
      onRightPress={() => setVisible((value) => !value)}
    />
  );
}

export function Button({
  title,
  onPress,
  loading = false,
  variant = "primary",
  disabled = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  icon?: IconName;
}) {
  const blocked = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        blocked && styles.buttonDisabled,
        pressed && !blocked && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary" || variant === "danger"
              ? palette.white
              : palette.primary
          }
        />
      ) : (
        <>
          {icon ? (
            <MaterialCommunityIcons
              name={icon}
              size={20}
              color={
                variant === "primary" || variant === "danger"
                  ? palette.white
                  : variant === "ghost"
                    ? palette.navy
                    : palette.primary
              }
            />
          ) : null}
          <Text
            style={[
              styles.buttonText,
              (variant === "secondary" || variant === "ghost") &&
                styles.buttonTextSecondary,
              blocked && styles.buttonTextDisabled,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
export function TextLink({
  title,
  onPress,
  icon,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={styles.textLink}
    >
      {icon ? (
        <MaterialCommunityIcons name={icon} size={18} color={palette.primary} />
      ) : null}
      <Text style={styles.linkText}>{title}</Text>
    </Pressable>
  );
}

export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "error" | "success";
}) {
  const icon: IconName =
    tone === "error"
      ? "alert-circle-outline"
      : tone === "success"
        ? "check-circle-outline"
        : "information-outline";
  return (
    <View
      accessibilityRole="alert"
      style={[styles.notice, styles[`notice_${tone}`]]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={21}
        color={
          tone === "error"
            ? palette.danger
            : tone === "success"
              ? palette.success
              : palette.primary
        }
      />
      <Text
        style={[
          styles.noticeText,
          tone === "error" && { color: palette.danger },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}
export function InfoRow({
  label,
  value,
  icon,
  last = false,
}: {
  label: string;
  value: string | null;
  icon?: IconName;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.rowBorder]}>
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={21}
          color={palette.navySoft}
        />
      ) : null}
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>
          {value || "Sin información registrada"}
        </Text>
      </View>
    </View>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const pending = status.toLowerCase().includes("pendiente");
  const cancelled = status.toLowerCase().includes("cancelada");
  return (
    <View
      style={[
        styles.badge,
        cancelled
          ? styles.badgeDanger
          : pending
            ? styles.badgeWarning
            : styles.badgeSuccess,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: cancelled
              ? palette.danger
              : pending
                ? palette.warning
                : palette.success,
          },
        ]}
      >
        {status}
      </Text>
    </View>
  );
}
export function CategoryChip({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function LoadingState({
  label = "Cargando información…",
}: {
  label?: string;
}) {
  return (
    <View style={styles.state}>
      <ActivityIndicator size="large" color={palette.primary} />
      <Text style={styles.stateDetail}>{label}</Text>
    </View>
  );
}
export function EmptyState({
  title,
  detail,
  icon = "inbox-outline",
}: {
  title: string;
  detail: string;
  icon?: IconName;
}) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <MaterialCommunityIcons name={icon} size={30} color={palette.primary} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDetail}>{detail}</Text>
    </View>
  );
}

export const ui = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm, alignItems: "center" },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.sm,
    alignItems: "center",
  },
  cardTitle: { color: palette.navy, ...typography.section },
  body: { color: palette.textMuted, ...typography.body },
  link: {
    color: palette.primary,
    ...typography.label,
    paddingVertical: space.sm,
  },
  badge: {
    color: palette.primary,
    backgroundColor: palette.primarySoft,
    overflow: "hidden",
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.round,
    ...typography.caption,
  },
});
const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1, backgroundColor: palette.canvas },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.md,
    flexGrow: 1,
  },
  authHeader: {
    alignItems: "center",
    paddingTop: space.sm,
    paddingBottom: space.sm,
    gap: space.xs,
  },
  brandMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.xs,
  },
  authTitle: {
    color: palette.navy,
    textAlign: "center",
    ...typography.display,
  },
  authSubtitle: {
    color: palette.textMuted,
    textAlign: "center",
    maxWidth: 310,
    ...typography.body,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 48,
    gap: space.sm,
  },
  back: {
    width: control.touch,
    height: control.touch,
    borderRadius: radius.round,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surface,
  },
  headerText: { flex: 1, gap: space.xxs },
  pageTitle: { color: palette.navy, ...typography.title },
  pageSubtitle: { color: palette.textMuted, ...typography.body },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: space.md,
    gap: space.md,
    ...elevation,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: space.sm },
  smallIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { color: palette.navy, ...typography.section },
  field: { gap: space.xs },
  label: { color: palette.navy, ...typography.label },
  inputShell: {
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
  input: { flex: 1, color: palette.text, fontSize: 16, paddingVertical: 11 },
  inputError: { borderColor: palette.danger },
  error: { color: palette.danger, ...typography.caption },
  button: {
    minHeight: control.minHeight,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    paddingHorizontal: space.md,
    borderWidth: 1,
  },
  button_primary: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  button_secondary: {
    backgroundColor: palette.surface,
    borderColor: palette.primary,
  },
  button_danger: {
    backgroundColor: palette.danger,
    borderColor: palette.danger,
  },
  button_ghost: { backgroundColor: "transparent", borderColor: "transparent" },
  buttonDisabled: {
    backgroundColor: palette.disabled,
    borderColor: palette.disabled,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: palette.primaryPressed,
  },
  buttonText: { color: palette.white, ...typography.control },
  buttonTextSecondary: { color: palette.primary },
  buttonTextDisabled: { color: palette.disabledText },
  textLink: {
    minHeight: control.touch,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    paddingHorizontal: space.sm,
  },
  linkText: { color: palette.primary, ...typography.label },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  notice_info: { backgroundColor: palette.primarySoft, borderColor: "#C5DDFC" },
  notice_error: { backgroundColor: palette.dangerSoft, borderColor: "#F4C7C3" },
  notice_success: {
    backgroundColor: palette.successSoft,
    borderColor: "#BCE8DD",
  },
  noticeText: { flex: 1, color: palette.navy, ...typography.body },
  infoRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  infoText: { flex: 1, gap: 2 },
  infoLabel: { color: palette.textMuted, ...typography.caption },
  infoValue: { color: palette.navy, ...typography.body },
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.round,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
  },
  badgeWarning: { backgroundColor: palette.warningSoft },
  badgeSuccess: { backgroundColor: palette.successSoft },
  badgeDanger: { backgroundColor: palette.dangerSoft },
  badgeText: { textTransform: "capitalize", ...typography.caption },
  chip: {
    minHeight: 40,
    paddingHorizontal: space.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: palette.surface,
  },
  chipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  chipText: { color: palette.textMuted, ...typography.label },
  chipTextSelected: { color: palette.white },
  state: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    padding: space.xl,
  },
  stateIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.xs,
  },
  stateTitle: {
    color: palette.navy,
    textAlign: "center",
    ...typography.section,
  },
  stateDetail: {
    color: palette.textMuted,
    textAlign: "center",
    ...typography.body,
  },
});
