const fs = require("fs"); const path = require("path"); const os = require("os"); const Database = require("better-sqlite3");
const Source = require("../src/models/Source"); const objectsConfig = require("../src/config/objects"); const trendObjects = require("../src/config/trendObjects"); const Processor = require("../src/Processor"); const TrendManager = require("../src/TrendManager"); const TelemetryDatabase = require("../database/Database"); const WAL = require("../database/WAL");
describe("1. Конфигурация системы", () => {
    test("Должно быть 4000 объектов", () => { expect(objectsConfig).toHaveLength(4000); });
    test("Должно быть 4 источника по 1000 объектов", () => {
        for (let id = 1; id <= 4; id++) {
            expect(
                objectsConfig.filter(object => object.sourceId === id)
            ).toHaveLength(1000);
        }
    });

    test("Названия объектов должны быть уникальными", () => {
        const names = objectsConfig.map(object => object.name);
        expect(new Set(names).size).toBe(4000);
    });

    test("Тип каждого объекта должен быть number или boolean", () => {
        for (const object of objectsConfig) {
            expect(["number", "boolean"]).toContain(object.type);
        }
    });

    test("Должно быть 20 объектов для трендов", () => {
        expect(trendObjects).toHaveLength(20);
    });
});
describe("2. Обновление источников", () => {
    test("Каждый источник должен содержать 1000 объектов", () => { for (let id = 1; id <= 4; id++) { expect(new Source(id).objects).toHaveLength(1000); } });
    test("За обновление меняется от 100 до 600 объектов", () => {
        for (let id = 1; id <= 4; id++) {
            const changed = new Source(id).updateObjects();

            expect(changed.length).toBeGreaterThanOrEqual(100);
            expect(changed.length).toBeLessThanOrEqual(600);
        }
    });

    test("В одном обновлении нет повторяющихся объектов", () => {
        const changed = new Source(1).updateObjects();
        const names = changed.map(object => object.name);

        expect(new Set(names).size).toBe(names.length);
    });

    test("Источники используют разные объекты", () => {
        const source1 = new Source(1);
        const source2 = new Source(2);

        const names1 = new Set(source1.objects.map(object => object.name));

        for (const object of source2.objects) {
            expect(names1.has(object.name)).toBe(false);
        }
    });
});
describe("3. Архив, WAL, валидация и тренды", () => {
    let tempDir; let db; let processor; let walPath; let errorLogPath;
    beforeEach(() => {
        tempDir = fs.mkdtempSync(
            path.join(os.tmpdir(), "telemetry-test-")
        );

        const dbPath = path.join(tempDir, "test.db");
        walPath = path.join(tempDir, "test.wal");
        errorLogPath = path.join(tempDir, "error.log");

        db = new Database(dbPath);

        db.exec(`
        CREATE TABLE telemetry_archive (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER NOT NULL,
            object_name TEXT NOT NULL,
            value_type TEXT NOT NULL,
            value TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE trend_archive (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER NOT NULL,
            object_name TEXT NOT NULL,
            value_type TEXT NOT NULL,
            value TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
    `);

        const fakeDatabase = {
            save: jest.fn((object, sourceId) => {
                db.prepare(`
                INSERT INTO telemetry_archive
                (source_id, object_name, value_type, value, created_at)
                VALUES (?, ?, ?, ?, ?)
            `).run(
                    sourceId,
                    object.name,
                    object.type,
                    String(object.value),
                    new Date().toISOString()
                );
            }),

            saveTrend: jest.fn((object, sourceId) => {
                db.prepare(`
                INSERT INTO trend_archive
                (source_id, object_name, value_type, value, created_at)
                VALUES (?, ?, ?, ?, ?)
            `).run(
                    sourceId,
                    object.name, object.type,
                    String(object.value),
                    new Date().toISOString()
                );
            })
        };

        processor = new Processor();

        // Подменяем рабочие компоненты тестовыми,
        // чтобы не изменять настоящую базу и журналы.
        processor.database = fakeDatabase;
        processor.wal = new WAL(walPath);
        processor.trendManager = new TrendManager(fakeDatabase);

        jest.spyOn(processor, "logInvalid").mockImplementation(
            (sourceId, object, reason, expectedType) => {
                fs.appendFileSync(
                    errorLogPath,
                    JSON.stringify({
                        sourceId,
                        name: object.name,
                        value: object.value,
                        reason,
                        expectedType
                    }) + "\n"
                );
            }
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();

        if (db && db.open) {
            db.close();
        }

        if (tempDir) {
            fs.rmSync(tempDir, {
                recursive: true,
                force: true
            });
        }
    });

    test("Правильное числовое значение сохраняется в архиве", () => {
        const object = {
            name: objectsConfig.find(o => o.type === "number").name,
            type: "number",
            value: 42
        };

        processor.receive(1, [object]);

        const row = db.prepare(`
        SELECT * FROM telemetry_archive WHERE object_name = ?
    `).get(object.name);

        expect(row).toBeDefined();
        expect(row.value).toBe("42");
    });

    test("Правильное логическое значение сохраняется в архиве", () => {
        const config = objectsConfig.find(o => o.type === "boolean");

        processor.receive(1, [{
            name: config.name,
            type: "boolean",
            value: true
        }]);

        const row = db.prepare(`
        SELECT * FROM telemetry_archive WHERE object_name = ?
    `).get(config.name);

        expect(row).toBeDefined();
        expect(row.value).toBe("true");
    });

    test("Неверное значение не попадает в основной архив", () => {
        const config = objectsConfig.find(o => o.type === "number");

        processor.receive(1, [{
            name: config.name,
            type: "number",
            value: "invalid"
        }]);

        const row = db.prepare(`
        SELECT * FROM telemetry_archive WHERE object_name = ?
    `).get(config.name);

        expect(row).toBeUndefined();
    });

    test("Несовпадающий тип отклоняется", () => {
        const config = objectsConfig.find(o => o.type === "number");

        processor.receive(1, [{
            name: config.name,
            type: "boolean",
            value: true
        }]);

        const row = db.prepare(`
        SELECT * FROM telemetry_archive WHERE object_name = ?
    `).get(config.name);

        expect(row).toBeUndefined();
    });

    test("Неизвестный объект отклоняется", () => {
        processor.receive(1, [{
            name: "unknown_object",
            type: "number",
            value: 10
        }]);

        expect(
            db.prepare("SELECT COUNT(*) AS total FROM telemetry_archive").get().total
        ).toBe(0);
    });

    test("Неправильное значение попадает в журнал ошибок", () => {
        const config = objectsConfig.find(o => o.type === "number");

        processor.receive(1, [{
            name: config.name,
            type: "number",
            value: "invalid"
        }]);

        expect(fs.existsSync(errorLogPath)).toBe(true);

        const log = fs.readFileSync(errorLogPath, "utf8");

        expect(log).toContain(config.name);
        expect(log).toContain("invalid");
    });

    test("WAL записывает полученные значения", () => {
        const config = objectsConfig.find(o => o.type === "number");

        processor.receive(1, [{
            name: config.name,
            type: "number",
            value: "invalid"
        }]);

        const wal = fs.readFileSync(walPath, "utf8");

        expect(wal).toContain(config.name);
        expect(wal).toContain("invalid");
    });

    test("В WAL попадают и правильные, и неправильные значения", () => {
        const numberConfig = objectsConfig.find(o => o.type === "number");

        processor.receive(1, [
            {
                name: numberConfig.name,
                type: "number",
                value: 25
            },
            {
                name: numberConfig.name,
                type: "number",
                value: "invalid"
            }
        ]);

        const lines = fs.readFileSync(walPath, "utf8")
            .trim()
            .split("\n");

        expect(lines).toHaveLength(2);
    });

    test("Трендовый объект записывается в архив трендов", () => {
        const config = trendObjects[0];

        const value = config.type === "number" ? 12 : true;

        processor.receive(1, [{
            name: config.name,
            type: config.type,
            value
        }]);

        const row = db.prepare(`
        SELECT * FROM trend_archive WHERE object_name = ?
    `).get(config.name);

        expect(row).toBeDefined();
    });

    test("Нетрендовый объект не попадает в архив трендов", () => {
        const config = objectsConfig.find(
            object => !trendObjects.some(trend => trend.name === object.name)
        );

        processor.receive(1, [{
            name: config.name,
            type: config.type,
            value: config.type === "number" ? 10 : true
        }]);

        const row = db.prepare(`
        SELECT * FROM trend_archive WHERE object_name = ?
    `).get(config.name);

        expect(row).toBeUndefined();
    });

    test("История тренда ограничивается 3600 значениями", () => {
        const trendManager = new TrendManager({
            saveTrend: jest.fn()
        });

        const config = trendObjects[0];

        for (let i = 0; i < 3601; i++) {
            trendManager.add({
                name: config.name,
                type: config.type,
                value: config.type === "number" ? i : i % 2 === 0
            }, config.sourceId);
        }

        expect(trendManager.trends.get(config.name)).toHaveLength(3600);
    });
});
describe("4. Нагрузка", () => {
    test("Четыре источника могут выполнить 100 обновлений", () => {
        const sources = [new Source(1), new Source(2), new Source(3), new Source(4)];
        const start = Date.now();
        let totalChanged = 0;

        for (let i = 0; i < 100; i++) {
            for (const source of sources) {
                totalChanged += source.updateObjects().length;
            }
        }

        const duration = Date.now() - start;

        expect(totalChanged).toBeGreaterThanOrEqual(40000);
        expect(totalChanged).toBeLessThanOrEqual(240000);

        console.log(
            `100 циклов для 4 источников: ${duration} мс; ` +
            `обновлено объектов: ${totalChanged}`
        );
    });
});