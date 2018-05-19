var system;
var debug   = require('debug')('lib/action');
var shortid = require('shortid');

function action(system) {
	var self = this;

	self.system = system;
	self.actions = {};
	self.bank_actions = {};

	self.system.on('bank-pressed', function(page, bank) {

		debug('trying to run bank',page,bank);
		if (self.bank_actions[page] === undefined) return;
		if (self.bank_actions[page][bank] === undefined) return;
		if (self.bank_actions[page][bank].length === 0) return;

		debug('found actions');
		for (var n in self.bank_actions[page][bank]) {
			var a = self.bank_actions[page][bank][n];
			self.system.emit('action_run', a.instance, a.action);
		}
	});

	self.system.emit('io_get', function(io) {
		self.io = io;
		self.io.on('connect', function(client) {
			client.on('get_actions', function() {
				client.emit('actions', self.actions);
			});

			client.on('bank_addAction', function(page,bank,action) {
				if (self.bank_actions[page] === undefined) self.bank_actions[page] = {};
				if (self.bank_actions[page][bank] === undefined) self.bank_actions[page][bank] = [];
				var s = action.split(/:/);

				self.bank_actions[page][bank].push({
					'id': shortid.generate(),
					'label': action,
					'instance': s[0],
					'action': s[1]
				});

				client.emit('bank_getActions:result', page, bank, self.bank_actions[page][bank] );
			});

			client.on('bank_delAction', function(page, bank, id) {
				var ba = self.bank_actions[page][bank];
				for (var n in ba) {
					if (ba[n].id == id) {
						delete self.bank_actions[page][bank][n];
						break;
					}
				}
				var cleanup = [];
				for (var n in ba) {
					if (ba[n] !== null) {
						cleanup.push(ba[n]);
					}
				}
				self.bank_actions[page][bank] = cleanup;

				client.emit('bank_getActions:result', page, bank, self.bank_actions[page][bank] );
			});

			client.on('bank_getActions', function(page, bank) {
				if (self.bank_actions[page] === undefined) self.bank_actions[page] = {};
				if (self.bank_actions[page][bank] === undefined) self.bank_actions[page][bank] = [];
				client.emit('bank_getActions:result', page, bank, self.bank_actions[page][bank] );
			});
		});
	});



	self.system.on('instance_actions', function(id, actions) {

		for (var n in actions) {
			var a = actions[n];
			self.actions[id+':'+n] = a;
			debug('adding action', id+':'+n);
		}

		// TODO: throttle this. when we have 16000 actions, we cant send them all n_instances times.
		self.io.emit('actions', self.actions);
	});

	return self;
}

action.prototype.func = function () {
	var self = this;
};

exports = module.exports = function (system) {
	return new action(system);
};