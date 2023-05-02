export const select = (table: string, selectedValue = '*', comparisonField?: string) => `SELECT ${selectedValue} FROM ${table}${comparisonField ? ` WHERE ${comparisonField} = ?` : ''}`;
export const insert = (table: string, valueNames: string[]) => `INSERT INTO ${table} (${valueNames.join(', ')} VALUES (${Array.from({ length: valueNames.length }, () => '?').join(', ')}) IF NOT EXISTS`;
export const update = (table: string, field: string, comparisonField?: string) => `UPDATE ${table} SET ${field} = ?${comparisonField ? ` WHERE ${comparisonField} = ?` : ''}`;
export const del = (table: string, comparisonField?: string) => `DELETE FROM ${table}${comparisonField ? ` WHERE ${comparisonField} = ?` : ''}`;
