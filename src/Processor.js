const fs = require("fs");
const objectsConfig = require("./config/objects");
const TelemetryDatabase = require("../database/Database");
const WAL = require("../database/WAL");
const TrendManager = require("./TrendManager");

class Processor {
    constructor() {
        this.database = new TelemetryDatabase();
        this.wal = new WAL("./logs/telemetry.wal");
        this.trendManager = new TrendManager(this.database);
        this.objectsMap = new Map(
            objectsConfig.map(object => [object.name, object])
        );
    }

    receive(sourceId, changedObjects) {
        let validCount = 0;
        let invalidCount = 0;

        changedObjects.forEach(object => {
            this.wal.write(sourceId, object);

            const config = this.objectsMap.get(object.name);

            if (!config) {
                invalidCount++;
                this.logInvalid(
                    sourceId,
                    object,
                    "Объект отсутствует в конфигурации",
                    null
                );
                return;
            }

            if (object.type !== config.type) {
                invalidCount++;
                this.logInvalid(
                    sourceId,
                    object,
                    "Тип объекта не совпадает с конфигурацией",
                    config.type
                );
                return;
            }

            if (
                config.type === "number" &&
                typeof object.value !== "number"
            ) {
                invalidCount++;
                this.logInvalid(
                    sourceId,
                    object,
                    "Значение должно быть числом",
                    config.type
                );
                return;
            }

            if (
                config.type === "boolean" &&
                typeof object.value !== "boolean"
            ) {
                invalidCount++;
                this.logInvalid(
                    sourceId,
                    object,
                    "Значение должно быть true или false",
                    config.type
                );
                return;
            }

            this.database.save(object, sourceId);
            this.trendManager.add(object, sourceId); 
            validCount++;
        });

        console.log(
            `Источник ${sourceId}: получено ${changedObjects.length}, ` +
            `валидных: ${validCount}, невалидных: ${invalidCount}`
        );
    }

    logInvalid(sourceId, object, reason, expectedType) {
        const time = new Date().toISOString();

        const logMessage = `[${time}]
Источник: ${sourceId};
Объект: ${object.name};
Полученный тип: ${object.type};
Полученное значение: ${object.value};
Ожидаемый тип: ${expectedType};
Причина: ${reason}\n\n`;

        fs.appendFileSync(
            "./logs/error.log",
            logMessage,
            "utf8"
        );
    }
}

module.exports = Processor;
