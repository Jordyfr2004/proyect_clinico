import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useRemote } from "../use-remote";

describe("useRemote", () => {
  test("retains confirmed data and reports a failed refresh", async () => {
    const loader = jest
      .fn<Promise<string[]>, []>()
      .mockResolvedValueOnce(["confirmado"])
      .mockRejectedValueOnce(new Error("No se pudo actualizar."));
    const { result } = renderHook(() => useRemote(loader));

    await waitFor(() => expect(result.current.loading).toBe(false));

    let refreshResult: Awaited<ReturnType<typeof result.current.reload>>;
    await act(async () => {
      refreshResult = await result.current.reload();
    });

    expect(refreshResult!).toEqual({ ok: false });
    expect(result.current.data).toEqual(["confirmado"]);
    expect(result.current.error).toBe("No se pudo actualizar.");
  });

  test("returns the confirmed payload after a successful refresh", async () => {
    const loader = jest
      .fn<Promise<string[]>, []>()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(["actualizado"]);
    const { result } = renderHook(() => useRemote(loader));

    await waitFor(() => expect(result.current.loading).toBe(false));

    let refreshResult: Awaited<ReturnType<typeof result.current.reload>>;
    await act(async () => {
      refreshResult = await result.current.reload();
    });

    expect(refreshResult!).toEqual({ ok: true, data: ["actualizado"] });
    expect(result.current.data).toEqual(["actualizado"]);
    expect(result.current.error).toBe("");
  });
});
