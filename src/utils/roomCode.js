export const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(values[i] % chars.length);
  }
  return result;
};

export const validateRoomCode = (code) => {
  if (typeof code !== 'string') return false;
  return /^[A-Z0-9]{6}$/.test(code);
};

export const formatRoomCode = (code) => {
  if (typeof code !== 'string') return '';
  const formatted = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return formatted.slice(0, 6);
};
