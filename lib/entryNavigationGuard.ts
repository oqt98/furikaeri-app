type GuardHandler = (() => Promise<boolean> | boolean) | null;

let currentHandler: GuardHandler = null;

export function registerEntryLeaveGuard(handler: Exclude<GuardHandler, null>) {
  currentHandler = handler;

  return () => {
    if (currentHandler === handler) {
      currentHandler = null;
    }
  };
}

export async function confirmEntryLeave() {
  if (!currentHandler) return true;
  return await currentHandler();
}
