const Database = require("better-sqlite3");
const db = new Database("./database/telemetry.db");

const telemetryRows = db.prepare(`
  SELECT * FROM telemetry_archive 
  ORDER BY id DESC 
  LIMIT 10
`).all();

const trendRows = db.prepare(`
  SELECT * FROM trend_archive 
  ORDER BY id DESC 
  LIMIT 10
`).all();

console.log("\nПоследние 10 записей основного архива:");
console.table(telemetryRows);

console.log("\nПоследние 10 записей трендов:");
console.table(trendRows);

const trendCount = db.prepare(`
  SELECT COUNT(*) AS total 
  FROM trend_archive
`).get();

console.log("\nВсего записей в архиве трендов:", trendCount.total);

db.close();
