var util = require('util');
var Connector = require('loopback-connector').Connector;
var utils = require('../utils');
var crypto = require('crypto');

/**
 * Initialize the Transient connector against the given data source
 *
 * @param {DataSource} dataSource The loopback-datasource-juggler dataSource
 * @param {Function} [callback] The callback function
 */
exports.initialize = function initializeDataSource(dataSource, callback) {
  dataSource.connector = new Transient(null, dataSource.settings);
  dataSource.connector.connect(callback);
};

exports.Transient = Transient;

function Transient(m, settings) {
  settings = settings || {};
  if (typeof settings.generateId === 'function') {
    this.generateId = settings.generateId.bind(this);
  }
  this.defaultIdType = settings.defaultIdType || String;
  if (m instanceof Transient) {
    this.isTransaction = true;
    this.constructor.super_.call(this, 'transient', settings);
    this._models = m._models;
  } else {
    this.isTransaction = false;
    this.constructor.super_.call(this, 'transient', settings);
  }
}

util.inherits(Transient, Connector);

Transient.prototype.getDefaultIdType = function() {
  return this.defaultIdType;
};

Transient.prototype.getTypes = function() {
  return ['db', 'nosql', 'transient'];
};

Transient.prototype.connect = function (callback) {
  if (this.isTransaction) {
    this.onTransactionExec = callback;
  } else {
    process.nextTick(callback);
  }
};

Transient.prototype.generateId = function(model, data, idName) {
  var idType;
  var props = this._models[model].properties;
  if (idName) idType = props[idName] && props[idName].type;
  idType = idType || this.getDefaultIdType();
  if (idType === Number) {
    return Math.floor(Math.random() * 10000); // max. 4 digits
  } else {
    return crypto.randomBytes(Math.ceil(24/2))
        .toString('hex') // convert to hexadecimal format
        .slice(0, 24);   // return required number of characters
  }
};

Transient.prototype.exists = function exists(model, id, callback) {
  process.nextTick(function () { callback(null, false); }.bind(this));
};

Transient.prototype.find = function find(model, id, callback) {
  process.nextTick(function () { callback(null, null); }.bind(this));
};

Transient.prototype.all = function all(model, filter, callback) {
  process.nextTick(function () { callback(null, []); });
};

Transient.prototype.count = function count(model, callback, where) {
  process.nextTick(function () { callback(null, 0); });
};

Transient.prototype.create = function create(model, data, callback) {
  var props = this._models[model].properties;
  var idName = this.idName(model);
  if (idName && props[idName]) {
    var id = this.getIdValue(model, data) || this.generateId(model, data, idName);
    id = (props[idName] && props[idName].type && props[idName].type(id)) || id;
    this.setIdValue(model, data, id);
  }
  this.flush('create', id, callback);
};

Transient.prototype.save = function save(model, data, callback) {
  this.flush('save', data, callback);
};

Transient.prototype.update =
  Transient.prototype.updateAll = function updateAll(model, where, data, cb) {
    var count = 0;
    this.flush('update', {count: count}, cb);
};

Transient.prototype.updateAttributes = function updateAttributes(model, id, data, cb) {
  if (!id) {
    var err = new Error('You must provide an id when updating attributes!');
    if (cb) {
      return cb(err);
    } else {
      throw err;
    }
  }

  this.setIdValue(model, data, id);
  this.save(model, data, cb);
};

Transient.prototype.destroy = function destroy(model, id, callback) {
  this.flush('destroy', null, callback);
};

Transient.prototype.destroyAll = function destroyAll(model, where, callback) {
  if (!callback && 'function' === typeof where) {
    callback = where;
    where = undefined;
  }
  this.flush('destroyAll', null, callback);
};

/*!
 * Flush the cache - noop.
 * @param {Function} callback
 */
Transient.prototype.flush = function (action, result, callback) {
  process.nextTick(function () { callback && callback(null, result); });
};

Transient.prototype.transaction = function () {
  return new Transient(this);
};

Transient.prototype.exec = function (callback) {
  this.onTransactionExec();
  setTimeout(callback, 50);
};
