export function toRemoteTagId(userId: string, localTagId: string) {
  return `${userId}:${localTagId}`;
}

export function toLocalTagId(userId: string, remoteTagId: string) {
  const prefix = `${userId}:`;
  return remoteTagId.startsWith(prefix)
    ? remoteTagId.slice(prefix.length)
    : remoteTagId;
}
