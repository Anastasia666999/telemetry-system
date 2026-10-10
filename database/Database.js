const Database = require("better-sqlite3");
const db = new Database("./database/telemetry.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS telemetry_archive ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    source_id INTEGER NOT NULL, 
    object_name TEXT NOT NULL, 
    value_type TEXT NOT NULL, 
    value TEXT NOT NULL, 
    created_at TEXT NOT NULL 
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS trend_archive ( 
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    source_id INTEGER NOT NULL, 
    object_name TEXT NOT NULL, 
    value_type TEXT NOT NULL, 
    value TEXT NOT NULL, 
    created_at TEXT NOT NULL 
  )
`);

class TelemetryDatabase {
    constructor() {
        this.saveTelemetryStatement = db.prepare(`
      INSERT INTO telemetry_archive (source_id, object_name, value_type, value, created_at) 
      VALUES (?, ?, ?, ?, ?)
    `);

        this.saveTrendStatement = db.prepare(`
        INSERT INTO trend_archive
        (source_id, object_name, value_type, value, created_at)
        VALUES (?, ?, ?, ?, ?)
    `);
    }

    save(object, sourceId) {
        this.saveTelemetryStatement.run(
            sourceId,
            object.name,
            object.type,
            String(object.value),
            new Date().toISOString()
        );
    }

    saveTrend(object, sourceId) {
        this.saveTrendStatement.run(
            sourceId,
            object.name,
            object.type,
            String(object.value),
            new Date().toISOString()
        );
    }
}

module.exports = TelemetryDatabase;
