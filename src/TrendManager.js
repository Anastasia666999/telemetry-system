const trendObjects = require("./config/trendObjects");

class TrendManager {
    constructor(database) {
        this.database = database;
        this.trends = new Map();

        trendObjects.forEach(object => {
            this.trends.set(object.name, []);
        });
    }

    add(object, sourceId) {
        if (!this.trends.has(object.name)) {
            return;
        }

        const values = this.trends.get(object.name);

        const trendValue = {
            value: object.value,
            createdAt: new Date().toISOString()
        };

        values.push(trendValue);

        // Оставляем только последние 3600 значений в оперативной памяти
        if (values.length > 3600) {
            values.shift();
        }

        this.database.saveTrend(object, sourceId);
    }

    recordCurrentValues(sources) {
        sources.forEach(source => {
            source.objects.forEach(object => {
                if (!this.trends.has(object.name)) {
                    return;
                }

                this.add(object, source.id);
            });
        });
    }
}

module.exports = TrendManager;
