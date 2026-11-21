import { Platform } from "react-native";

export const palette = {
  navy: "#102A43",
  navySoft: "#243B53",
  primary: "#1673E6",
  primaryPressed: "#0C5FC5",
  primarySoft: "#E8F2FF",
  teal: "#0E9F8A",
  tealSoft: "#E5F7F3",
  canvas: "#F4F8FC",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFD",
  border: "#D7E2EE",
  borderStrong: "#B8C8DA",
  text: "#102A43",
  textMuted: "#5D7188",
  textSoft: "#7B8DA2",
  success: "#087A63",
  successSoft: "#E5F7F3",
  warning: "#946200",
  warningSoft: "#FFF4D6",
  danger: "#B42318",
  dangerSoft: "#FDECEA",
  disabled: "#C8D4E1",
  disabledText: "#66788C",
  white: "#FFFFFF",
  scrim: "rgba(16, 42, 67, 0.45)",
  muted: "#5D7188",
  softBlue: "#E8F2FF",
  ink: "#102A43",
  softGreen: "#E5F7F3",
} as const;

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;
export const radius = { sm: 10, md: 14, lg: 18, xl: 22, round: 999 } as const;
export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: "800" as const },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "800" as const },
  section: { fontSize: 18, lineHeight: 24, fontWeight: "700" as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" as const },
  label: { fontSize: 14, lineHeight: 19, fontWeight: "700" as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: "600" as const },
  control: { fontSize: 16, lineHeight: 21, fontWeight: "700" as const },
} as const;
export const control = { minHeight: 50, icon: 22, touch: 44 } as const;
export const elevation =
  Platform.select({
    android: { elevation: 2 },
    default: {
      shadowColor: "#102A43",
      shadowOpacity: 0.07,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
    },
  }) ?? {};

// Compatibility for unused Expo starter components.
export const Colors = {
  light: {
    text: palette.text,
    background: palette.canvas,
    backgroundElement: palette.surface,
    backgroundSelected: palette.primarySoft,
    textSecondary: palette.textMuted,
  },
  dark: {
    text: "#FFFFFF",
    background: "#101828",
    backgroundElement: "#1D2939",
    backgroundSelected: "#344054",
    textSecondary: "#D0D5DD",
  },
} as const;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;
export const MaxContentWidth = 800;
export const Fonts = {
  sans: "system",
  serif: "serif",
  rounded: "system",
  mono: "monospace",
} as const;
