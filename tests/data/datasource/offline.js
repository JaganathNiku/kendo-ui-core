(function() {

    module("offline support", {
        teardown: function() {
            localStorage.removeItem("key")
        }
    });

    var DataSource = kendo.data.DataSource;

    test("state stores in localStorage under specified key", function() {
        var dataSource = new DataSource({
            offlineStorage: "key"
        });

        var state = { foo: "foo" };

        dataSource.offlineState(state);

        equal(localStorage.getItem("key"), '{"foo":"foo"}');
    });

    test("state returns item in localStorage under the specified key", function() {
        var dataSource = new DataSource({
            offlineStorage: "key"
        });

        localStorage.setItem("key", kendo.stringify({foo:"foo"}));

        var state = dataSource.offlineState();

        equal(state.foo, "foo");
    });

    test("state uses custom storage to save", 1, function() {
        var state = {};

        var dataSource = new DataSource({
            offlineStorage: {
                setItem: function(data) {
                    strictEqual(state, data)
                }
            }
        });

        dataSource.offlineState(state);
    });

    test("state returns empty object if localStorage doesn't contain an item for the specified key", function() {
        var dataSource = new DataSource({
            offlineStorage: "key"
        });

        var state = dataSource.offlineState();

        equal(kendo.stringify(state), "{}");
    });

    test("data stores in state", function() {
        var data = [{ foo: "foo" }];

        var dataSource = new DataSource({
            offlineStorage: "key",
            data: data
        });

        dataSource.read();

        equal(dataSource.offlineState().data.length, data.length);
        equal(dataSource.offlineState().data[0].foo, data[0].foo);
    });

    test("data returns data stored in state when offline", function() {
        var data = [{ foo: "foo" }];

        var dataSource = new DataSource({
            offlineStorage: "key"
        });

        dataSource.offlineState({
            data: data
        });
        dataSource.online(false);
        dataSource.read();

        deepEqual(dataSource.data().length, 1);
    });

    test("data persists uid when offline", function() {
        var data = [{ foo: "foo" }];

        var dataSource = new DataSource({
            offlineStorage: "key",
            data: data
        });

        dataSource.read();
        var uid = dataSource.at(0).uid;
        dataSource.online(false);
        dataSource.read();

        deepEqual(dataSource.at(0).uid, uid);
    });

    test("update stores the request in localStorage when not online", function() {
        var dataSource = new DataSource({
            offlineStorage: "key",
            schema: {
                model: {
                    id: "id"
                }
            },
            data: [
                { id: 1, foo: "foo" }
            ]
        });

        dataSource.read();
        dataSource.online(false);
        dataSource.get(1).set("foo", "bar");
        dataSource.sync();

        var state = dataSource.offlineState();

        equal(state.requests[0].type, "update");
        equal(state.requests[0].data.foo, "bar");
    });

    test("sync sends all pending update requests to transport", 2, function() {
        var dataSource = new DataSource({
            offlineStorage: "key",
            schema: {
                model: {
                    id: "id"
                }
            },
            transport: {
                read: function(options) {
                    options.success([
                        { id: 1, foo: "foo" },
                        { id: 2, foo: "foo" }
                    ]);
                },
                update: function(options) {
                    equal(options.data.foo, "bar");
                }
            }
        });

        dataSource.read();
        dataSource.online(false);
        dataSource.get(1).set("foo", "bar");
        dataSource.get(2).set("foo", "bar");
        dataSource.sync();

        dataSource.online(true);
    });

    test("sync sends all pending batch update requests to transport", 3, function() {
        var dataSource = new DataSource({
            offlineStorage: "key",
            batch: true,
            schema: {
                model: {
                    id: "id"
                }
            },
            transport: {
                read: function(options) {
                    options.success([
                        { id: 1, foo: "foo" },
                        { id: 2, foo: "foo" }
                    ]);
                },
                update: function(options) {
                    equal(options.data.models.length, 2);
                    equal(options.data.models[0].foo, "bar");
                    equal(options.data.models[1].foo, "baz");
                }
            }
        });

        dataSource.read();
        dataSource.online(false);
        dataSource.get(1).set("foo", "bar");
        dataSource.get(2).set("foo", "baz");
        dataSource.sync();

        dataSource.online(true);
    });

    test("sync removes requests that have been sent successfully", function() {
        var dataSource = new DataSource({
            offlineStorage: "key",
            schema: {
                model: {
                    id: "id"
                }
            },
            transport: {
                read: function(options) {
                    options.success([]);
                },
                update: function(options) {
                    if (options.data.foo == "foo") {
                        options.success();
                    }
                }
            }
        });

        dataSource.online(false);
        dataSource.offlineState({
            requests: [
                { data: {foo:"foo"}, type: "update"},
                { data: {foo:"bar"}, type: "update"}
            ]
        });
        dataSource.sync();

        dataSource.online(true);

        var state = dataSource.offlineState();

        equal(state.requests.length, 1);
        equal(state.requests[0].data.foo, "bar");
    });

    test("sync removes batch requests that have been sent successfully", function() {
        var dataSource = new DataSource({
            offlineStorage: "key",
            batch: true,
            schema: {
                model: {
                    id: "id"
                }
            },
            transport: {
                read: function(options) {
                    options.success([]);
                },
                update: function(options) {
                    if (options.data.models[0].foo == "foo") {
                        options.success();
                    }
                }
            }
        });

        dataSource.offlineState({
            requests: [
                { data: { models: [ { foo:"foo" } ] }, type: "update" },
                { data: { models: [ { foo:"bar" } ] }, type: "update" }
            ]
        });

        dataSource.sync();

        var state = dataSource.offlineState();

        equal(state.requests.length, 1);
        equal(state.requests[0].data.models[0].foo, "bar");
    });

    test("sync accepts data for batch requests that have been sent successfully", function() {
        var dataSource = new DataSource({
            offlineStorage: "key",
            batch: true,
            schema: {
                model: {
                    id: "id"
                }
            },
            transport: {
                read: function(options) {
                    options.success([{ id:1, foo: "foo" }]);
                },
                update: function(options) {
                    options.success([{ id: 1, foo: "baz" }]);
                }
            }
        });

        dataSource.read();
        dataSource.online(false);
        dataSource.get(1).set("foo", "bar");
        dataSource.sync();

        dataSource.online(true);

        equal(dataSource.get(1).foo, "baz");
    });

    test("sync accepts data for requests that have been sent successfully", function() {
        var dataSource = new DataSource({
            offlineStorage: "key",
            schema: {
                model: {
                    id: "id"
                }
            },
            transport: {
                read: function(options) {
                    options.success([{ id:1, foo: "foo" }]);
                },
                update: function(options) {
                    options.success({ id: 1, foo: "baz" });
                }
            }
        });

        dataSource.read();
        dataSource.online(false);
        dataSource.get(1).set("foo", "bar");
        dataSource.sync();
        dataSource.online(true);

        equal(dataSource.get(1).foo, "baz");
    });

    test("destroy stores the request in localStorage when not online", function() {
        var dataSource = new DataSource({
            offlineStorage: "key",
            schema: {
                model: {
                    id: "id"
                }
            },
            transport: {
                read: function(options) {
                    options.success([{ id:1, foo: "foo" }]);
                }
            }
        });

        dataSource.read();
        dataSource.online(false);
        dataSource.remove(dataSource.get(1));
        dataSource.sync();

        var state = dataSource.offlineState();

        equal(state.requests[0].type, "destroy");
        equal(state.requests[0].data.foo, "foo");
    });


    test("create stores the request in localStorage when not online", function() {
        var dataSource = new DataSource({
            offlineStorage: "key",
            schema: {
                model: {
                    id: "id"
                }
            }
        });

        dataSource.online(false);
        dataSource.add({ foo: "foo" });
        dataSource.sync();

        var state = dataSource.offlineState();

        equal(state.requests[0].type, "create");
        equal(state.requests[0].data.foo, "foo");
    });

    test("online returns true by default", function() {
        var dataSource = new kendo.data.DataSource({
            offlineStorage: "key"
        });

        equal(dataSource.online(), true);
    });

    test("data source stores its data when it syncs", function() {
        var dataSource = new kendo.data.DataSource({
            offlineStorage: "key",
            schema: {
                model: {
                    id: "id"
                }
            },
            data: [
                { id: 1, foo: "foo"}
            ]
        });

        dataSource.read();
        dataSource.online(false);
        dataSource.get(1).set("foo", "bar");
        dataSource.sync();

        var state = dataSource.offlineState();

        equal(state.data[0].foo, "bar");
    });

    test("sync of offline data triggers request start", 1, function() {
        var dataSource = new kendo.data.DataSource({
            offlineStorage: "key",
            schema: {
                model: {
                    id: "id"
                }
            },
            data: [
                { id:1, foo: "foo" }
            ]
        });

        dataSource.read();
        dataSource.online(false);
        dataSource.get(1).set("foo", "bar");
        dataSource.sync();
        dataSource.bind("requestStart", function(e) {
            equal(e.type, "update");
        });
        dataSource.online(true);
    })

    test("offlineState returns null if offlineStorage isn't enabled", function() {
        var dataSource = new kendo.data.DataSource({});

        equal(dataSource.offlineState(), null);
    });

}());
