const fs = require("fs");
class WAL {
    constructor(filePath) {
        this.filePath = filePath;
        fs.writeFileSync(
            this.filePath,
            "",
            {
                flag: "a"
            }
        );
    }

    write(sourceId, object) {
        const record = {
            sourceId: sourceId,
            objectName: object.name,
            type: object.type,
            value: object.value,
            createdAt: new Date().toISOString()
        };

        fs.appendFileSync(
            this.filePath,
            JSON.stringify(record) + "\n",
            "utf8"
        );
    }
}
module.exports = WAL;