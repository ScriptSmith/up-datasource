.info.version += "-patched"
|
.paths["/transactions"].get.parameters |= . +
    [{
        "name": "page[after]",
        "in": "query",
        "schema": { "type": "string" },
        "required": false,
        "description": "Missing pagination parameter"
    }]
|
.paths["/accounts/{accountId}/transactions"].get.parameters |= . +
    [{
        "name": "page[after]",
        "in": "query",
        "schema": { "type": "string" },
        "required": false,
        "description": "Missing pagination parameter"
    }]