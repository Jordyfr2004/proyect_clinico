const cleaners = new Set<() => void | Promise<void>>();

export const registerSessionCleanup = (clean: () => void | Promise<void>) => {
  cleaners.add(clean);
  return () => { cleaners.delete(clean); };
};

export const cleanupSession = async () => {
  await Promise.allSettled([...cleaners].map(async clean => clean()));
};
