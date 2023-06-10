const { loadFiles } = require('../Functions/loadFiles');

async function loadEvents(client) {
    console.time("Events Loaded");

    client.events = new Map();
    const events = new Array();

    const files = await loadFiles("Events");

    for (const file of files) {
        try {
            const event = require(file);
            console.log(event)
            const execute = (...args) => event.execute(client, ...args);

            const target = event.rest ? client.rest : client;

            target[event.once ? "once" : "on"](event.name, execute);

            events.push({ Event: event.name, Status: "✅" });
        } catch (error) {
            events.push({ Event: file.split("/").pop().slice(0, -3), Status: "❌" });
        }
    }

    console.table(events, ["Event", "Status"]);
    console.info("\nn\x1b[36%s\x1b[0m", "Loaded Events.");
    console.timeEnd("Events Loaded")
}

module.exports = { loadEvents };