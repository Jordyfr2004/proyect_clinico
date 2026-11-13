import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useRemote } from "../use-remote";

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

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

  test("keeps the newest response when an older request finishes last", async () => {
    const older = deferred<string[]>();
    const newer = deferred<string[]>();
    const loader = jest
      .fn<Promise<string[]>, []>()
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    const { result } = renderHook(() => useRemote(loader));

    await waitFor(() => expect(loader).toHaveBeenCalledTimes(1));

    let refresh!: ReturnType<typeof result.current.reload>;
    act(() => {
      refresh = result.current.reload();
    });
    await act(async () => newer.resolve(["respuesta reciente"]));
    await refresh;
    expect(result.current.data).toEqual(["respuesta reciente"]);

    await act(async () => older.resolve(["respuesta antigua"]));

    expect(result.current.data).toEqual(["respuesta reciente"]);
    expect(result.current.error).toBe("");
  });

  test("ignores an obsolete failure after a newer request succeeds", async () => {
    const older = deferred<string[]>();
    const loader = jest
      .fn<Promise<string[]>, []>()
      .mockReturnValueOnce(older.promise)
      .mockResolvedValueOnce(["respuesta reciente"]);
    const { result } = renderHook(() => useRemote(loader));

    await waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.reload();
    });
    await act(async () => older.reject(new Error("Error obsoleto")));

    expect(result.current.data).toEqual(["respuesta reciente"]);
    expect(result.current.error).toBe("");
  });

  test("shares one request between repeated manual refreshes", async () => {
    const refresh = deferred<string[]>();
    const loader = jest
      .fn<Promise<string[]>, []>()
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(refresh.promise);
    const { result } = renderHook(() => useRemote(loader));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let first!: ReturnType<typeof result.current.reload>;
    let second!: ReturnType<typeof result.current.reload>;
    act(() => {
      first = result.current.reload();
      second = result.current.reload();
    });

    expect(first).toBe(second);
    expect(loader).toHaveBeenCalledTimes(2);

    await act(async () => refresh.resolve(["actualizado"]));
    await first;
    expect(result.current.data).toEqual(["actualizado"]);
  });

  test("clears data from the previous scope before loading a new one", async () => {
    const nextUser = deferred<string[]>();
    type Loader = () => Promise<string[]>;
    type HookState = ReturnType<typeof useRemote<string[]>>;
    const previousLoader: Loader = jest
      .fn<Promise<string[]>, []>()
      .mockResolvedValue(["usuario anterior"]);
    const nextLoader: Loader = jest
      .fn<Promise<string[]>, []>()
      .mockReturnValue(nextUser.promise);
    const { result, rerender } = renderHook<HookState, { loader: Loader }>(
      ({ loader }) => useRemote(loader),
      { initialProps: { loader: previousLoader } },
    );
    await waitFor(() =>
      expect(result.current.data).toEqual(["usuario anterior"]),
    );

    rerender({ loader: nextLoader });

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
    await act(async () => nextUser.resolve(["usuario nuevo"]));
    expect(result.current.data).toEqual(["usuario nuevo"]);
  });
});
