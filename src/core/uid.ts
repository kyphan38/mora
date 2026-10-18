export const uid = () => (crypto.randomUUID?.() ?? String(Date.now()) + Math.random().toString(36).slice(2));
