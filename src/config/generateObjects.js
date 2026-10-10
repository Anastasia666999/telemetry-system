const fs = require("fs");
const objects = [];
const types = [
    {
        prefix: "temperature",
        type: "number",
        min: 0,
        max: 100
    },

    {
        prefix: "pressure",
        type: "number",
        min: 0,
        max: 10
    },

    {
        prefix: "speed",
        type: "number",
        min: 0,
        max: 3000
    },

    {
        prefix: "flow",
        type: "number",
        min: 0,
        max: 500
    },

    {
        prefix: "level",
        type: "number",
        min: 0,
        max: 100
    },

    {
        prefix: "voltage",
        type: "number",
        min: 0,
        max: 500
    },

    {
        prefix: "current",
        type: "number",
        min: 0,
        max: 100
    },

    {
        prefix: "pump_enabled",
        type: "boolean"
    },

    {
        prefix: "valve_open",
        type: "boolean"
    },

    {
        prefix: "alarm",
        type: "boolean"
    }];

for (let sourceId = 1; sourceId <= 4; sourceId++) {
    for (let i = 1; i <= 1000; i++) {
        const config = types[(i - 1) % types.length];

        const globalNumber = (sourceId - 1) * 1000 + i;

        const object = {
            sourceId: sourceId,
            name: `${config.prefix}_${String(globalNumber).padStart(4, "0")}`,
            type: config.type
        };

        if (config.type === "number") {
            object.initialValue =
                Math.round(
                    (config.min +
                        Math.random() * (config.max - config.min)) * 100
                ) / 100;
        } else {
            object.initialValue = Math.random() < 0.5;
        }

        objects.push(object);
    }
}
const fileContent = `const objects = ${JSON.stringify(objects, null, 4)}; \n\nmodule.exports = objects; \n`;

fs.writeFileSync(__dirname + "/objects.js", fileContent, "utf8");

console.log(`Создано объектов: ${objects.length}`);
console.log("Источник 1: 1000 объектов");
console.log("Источник 2: 1000 объектов");
console.log("Источник 3: 1000 объектов");
console.log("Источник 4: 1000 объектов");