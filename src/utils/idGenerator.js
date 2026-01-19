// Counter to ensure unique IDs when creating multiple items quickly
let idCounter = 0

/**
 * Generate a unique ID by combining timestamp with an incrementing counter.
 * This prevents ID collisions when multiple items are created in the same millisecond.
 * @returns {number} A unique numeric ID
 */
export const generateUniqueId = () => {
  const timestamp = Date.now()
  const uniqueId = timestamp * 1000 + idCounter
  idCounter = (idCounter + 1) % 1000 // Reset counter after 1000 to prevent overflow
  return uniqueId
}
