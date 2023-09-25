export const select = (table: string, selectedValue = '*', comparisonField: string) => `SELECT ${selectedValue} FROM ${table} WHERE ${comparisonField} = ?`;
export const insert = (table: string, valueNames: string[]) => `INSERT INTO ${table} (${valueNames.join(', ')}) VALUES (${Array.from({ length: valueNames.length }, () => '?').join(', ')}) IF NOT EXISTS`;
export const update = (table: string, field: string, comparisonField: string, rmTTL = false) => `UPDATE ${table}${rmTTL ? ' USING TTL 0' : ''} SET ${field} = ? WHERE ${comparisonField} = ?`;
export const del = (table: string, comparisonField: string) => `DELETE FROM ${table} WHERE ${comparisonField} = ?`;
