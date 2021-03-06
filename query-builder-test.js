var uid = 0;
var collectionMock = function () {
  var collection = new Meteor.Collection('test' + uid++);
  collection.lastQuery = null;
  var originalFind = collection.find;
  collection.find = function (selector) {
    collection.lastQuery = selector;
    originalFind.apply(this, arguments);
  };
  return collection;
};

var testExecute = function(query, options) {
  query._collection.lastQuery = null;
  query.execute(options);
  return query._collection.lastQuery;
}

Tinytest.add("query-builder - no filters", function (test) {
  var query = collectionMock().query();
  query.condition({ _id: "someId" });
  test.equal(
    testExecute(query),
    { _id: "someId" },
    "simple id query"
  );
});

Tinytest.add("query-builder - default filter", function (test) {
  var collection = collectionMock();
  collection.defaultFilters({
    softDelete: { deletedAt: null }
  });
  
  var query = collection.query();
  query.condition({ _id: "someId" });
  test.equal(
    testExecute(query),
    { $and: [{ _id: "someId" }, { deletedAt: null }] },
    "filter come after normal query"
  );
  
  var query = collection.query();
  query.condition({ name: "Max" });
  test.equal(
    testExecute(query),
    { $and: [{ name: "Max" }, { deletedAt: null }] },
    "still apply filter on secound query"
  );
});

Tinytest.add("query-builder - enable/disable filter", function (test) {
  var collection = collectionMock();
  collection.defaultFilters({
    softDelete: { deletedAt: null }
  });
  collection.filters({
    onlyOwn: { owner: "Meteor.userId()" },
    callback: function (parameter) {
      return { parameter: parameter }
    }
  });
  
  var query = collection.query();
  test.equal(
    testExecute(query),
    { deletedAt: null },
    "only use defaultFilters"
  );
  
  query.filter("onlyOwn", true);
  test.equal(
    testExecute(query),
    { $and: [{ deletedAt: null }, { owner: "Meteor.userId()" }] },
    "activate optional filter"
  );
  
  query.filter("softDelete", false);
  test.equal(
    testExecute(query),
    { owner: "Meteor.userId()" },
    "disable softDelete"
  );
  
  query.filter("callback", true, ['parameter']);
  test.equal(
    testExecute(query),
    { $and: [{ owner: "Meteor.userId()" }, { parameter: 'parameter' }] },
    "disable softDelete"
  );
});

Tinytest.add("query-builder - transform id to object", function (test) {
  var collection = collectionMock();
  var query = collection.query();
  var obj = query.constructor._objectCondition;
  
  test.equal(obj({ _id: "id" }), { _id: "id" }, "don't touch objects");
  test.equal(obj("id"), { _id: "id" }, "make object of id");
  var id = new Meteor.Collection.ObjectID();
  test.equal(obj(id), { _id: id }, "make object of mongo id");
});
