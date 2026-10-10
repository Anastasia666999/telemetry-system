const Source = require("./models/Source");
const Processor = require("./Processor");

const sources = [
    new Source(1),
    new Source(2),
    new Source(3),
    new Source(4)
];

const processor = new Processor();

console.log("Источников:", sources.length);

sources.forEach(source => {
    console.log(`Источник ${source.id}: ${source.objects.length} объектов`);
});

setInterval(() => {
    console.log("\n— Новая секунда —");
    
    // Получаем изменённые данные от всех источников
    sources.forEach(source => {
        const changedObjects = source.updateObjects();

        processor.receive(source.id, changedObjects);
    });

    // Записываем текущие значения 20 трендовых объектов
    processor.trendManager.recordCurrentValues(sources);

    // Выводим размер окна видимости
    console.log("\n--- ОКНО ВИДИМОСТИ ---");

    processor.trendManager.trends.forEach((values, objectName) => {
        console.log(`${objectName}: ${values.length} значений в памяти`);
    });
}, 1000);
