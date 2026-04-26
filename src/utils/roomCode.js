export const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const validateRoomCode = (code) => {
  if (!code) return false;
  return /^[A-Z0-9]{6}$/.test(code);
};

export const formatRoomCode = (code) => {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
};
