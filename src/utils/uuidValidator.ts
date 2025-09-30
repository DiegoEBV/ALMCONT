/**
 * Utilidades para validación de UUIDs
 */

/**
 * Valida si una cadena es un UUID válido
 * @param uuid - La cadena a validar
 * @returns true si es un UUID válido, false en caso contrario
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }

  // Patrón regex para UUID v4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Valida si una cadena es un UUID válido y lanza error si no lo es
 * @param uuid - La cadena a validar
 * @param fieldName - Nombre del campo para el mensaje de error
 * @throws Error si el UUID no es válido
 */
export function validateUUID(uuid: string, fieldName: string = 'UUID'): void {
  if (!isValidUUID(uuid)) {
    throw new Error(`${fieldName} inválido: "${uuid}". Se esperaba un UUID válido.`);
  }
}

/**
 * Valida si una cadena es un UUID válido o null/undefined
 * @param uuid - La cadena a validar
 * @returns true si es un UUID válido o null/undefined, false en caso contrario
 */
export function isValidUUIDOrNull(uuid: string | null | undefined): boolean {
  if (uuid === null || uuid === undefined) {
    return true;
  }
  return isValidUUID(uuid);
}

/**
 * Sanitiza un ID, devolviendo null si no es un UUID válido
 * @param id - El ID a sanitizar
 * @returns El UUID si es válido, null en caso contrario
 */
export function sanitizeUUID(id: string | null | undefined): string | null {
  if (!id || !isValidUUID(id)) {
    return null;
  }
  return id;
}