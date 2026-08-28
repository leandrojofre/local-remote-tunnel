const Database = require('better-sqlite3');

let db = null;
let insertOrReplace = null;
let insertIgnore = null;
let deleteByFilename = null;
let countStmtBase = null;
let selectBase = null;

/**
 * @param {string} dbPath
 * @returns {{
 *  db: Database.Database;
 *  insertOrReplace: Database.Statement;
 *  insertIgnore: Database.Statement;
 *  deleteByFilename: Database.Statement;
 *  countStmtBase: (whereClause: string) => string;
 *  selectBase: (whereClause: string) => string;
 * }}
 */
function init(dbPath) {
    if (db) return;

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.prepare(`
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY,
            filename TEXT UNIQUE,
            originalname TEXT,
            size INTEGER,
            mtime INTEGER,
            extension TEXT,
            timestamp INTEGER
        )
    `).run();

    insertOrReplace = db.prepare(`
        INSERT OR REPLACE INTO files (filename, originalname, size, mtime, extension, timestamp)
        VALUES (@filename, @originalname, @size, @mtime, @extension, @timestamp)
    `);

    insertIgnore = db.prepare(`
        INSERT OR IGNORE INTO files (filename, originalname, size, mtime, extension, timestamp)
        VALUES (@filename, @originalname, @size, @mtime, @extension, @timestamp)
    `);

    deleteByFilename = db.prepare(`
        DELETE FROM files WHERE filename = @filename
    `);

    countStmtBase = (whereClause) => `SELECT COUNT(*) as count FROM files ${whereClause}`;
    selectBase = (whereClause) => `SELECT filename, originalname, size, mtime, extension, timestamp FROM files ${whereClause} ORDER BY timestamp DESC LIMIT @limit OFFSET @offset`;

    return {
        db,
        insertOrReplace,
        insertIgnore,
        deleteByFilename,
        countStmtBase,
        selectBase,
    };
}

module.exports = {
    init,
};