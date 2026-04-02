// Shim for nanoid/non-secure to fix metro bundler issue
// This provides a simple fallback when the package can't be resolved

let counter = 0;

export const nanoid = (size = 21) => {
  // Simple nanoid implementation for development
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  const counterStr = (counter++).toString(36);
  
  return (timestamp + randomStr + counterStr).substring(0, size);
};

export default nanoid;
