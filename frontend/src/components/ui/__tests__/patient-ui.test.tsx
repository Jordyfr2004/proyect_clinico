import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import {
  Button,
  CategoryChip,
  getAppointmentStatusTone,
  getScreenBottomPadding,
} from "../patient-ui";

describe("Clínica Premium UI primitives", () => {
  test("a disabled action announces its state and cannot be submitted", () => {
    const onPress = jest.fn();
    render(<Button title="Registrarme" disabled onPress={onPress} />);

    const button = screen.getByRole("button", { name: "Registrarme" });
    expect(button.props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  test("stack screens own the Android bottom inset while tab screens do not duplicate it", () => {
    expect(getScreenBottomPadding("stack", 24)).toBe(40);
    expect(getScreenBottomPadding("auth", 24)).toBe(40);
    expect(getScreenBottomPadding("tab", 24)).toBe(16);
  });

  test.each([
    ["pendiente", "warning"],
    ["programada", "info"],
    ["cancelada", "danger"],
    ["completada", "success"],
  ] as const)(
    "represents the %s appointment state with a distinct semantic tone",
    (status, tone) => {
      expect(getAppointmentStatusTone(status)).toBe(tone);
    },
  );

  test("category filters keep the shared minimum accessible touch height", () => {
    render(<CategoryChip title="Todos" selected onPress={jest.fn()} />);

    const chip = screen.getByRole("button", { name: "Todos" });
    expect(
      StyleSheet.flatten(chip.props.style).minHeight,
    ).toBeGreaterThanOrEqual(44);
  });
});
