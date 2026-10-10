const TelemetryObject = require("./TelemetryObject"); const objectsConfig = require("../config/objects");
class Source { constructor(id) { this.id = id;
    this.objects = objectsConfig
        .filter(object => object.sourceId === id)
        .map(object => {
            return new TelemetryObject(
                object.name,
                object.type,
                object.initialValue
            );
        });
}

getRandomCount() {
    return Math.floor(Math.random() * 501) + 100;
}

updateObjects() {
    const count = this.getRandomCount();

    const indexes = Array.from(
        { length: this.objects.length },
        (_, index) => index
    );

    for (let i = indexes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }

    const changedObjects = [];

    for (let i = 0; i < count; i++) {
        const object = this.objects[indexes[i]];

        if (Math.random() < 0.01) {
            if (object.type === "number") {
                object.value = "invalid";
            } else {
                object.value = "invalid";
            }
        } else {
            if (object.type === "number") {
                object.value = Math.round(Math.random() * 10000) / 100;
            } else {
                object.value = Math.random() < 0.5;
            }
        }

        changedObjects.push(object);
    }

    return changedObjects;
}
}
module.exports = Source;