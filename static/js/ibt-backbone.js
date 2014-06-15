/** Models, collections and views. */

ibt.personDefaults = {name: '', _createdBy: null};
ibt.Person = Backbone.Model.extend({
	defaults: ibt.personDefaults,
	idAttribute: '_id'
});

/** Model of a group. */
ibt.groupDefaults = {date: '', group: '', attendants: []}
ibt.Group = Backbone.Model.extend({
	defaults: ibt.groupDefaults,
	idAttribute: '_id',

	parse: function(response, options) {
		ibt.debug(['ibt.Groups.parse; response:', response, 'options:', options]);
		if (!response) {
			return;
		}
		var personAttendants = [];
		_.each(response.attendants || [], function(personData) {
			var person = new ibt.Person(personData);
			personAttendants.push(person);
		});
		response.attendants = personAttendants;
		return response;
	},

	toJSON: function(options) {
		var attributes =  _.clone(this.attributes);
		var attendants = [];
		_.each(this.attributes.attendants || [], function(person) {
			attendants.push(person.toJSON(options));
		});
		attributes.attendants = attendants;
		return attributes;
	},

	addUser: function(name) {
		this.handleAttendants('add', name);
	},

	removeUser: function(name) {
		this.handleAttendants('remove', name);
	},

	handleAttendants: function(action, name) {
		var model = this;
		type = 'POST';
		if (action == 'remove') {
			type = 'DELETE';
		}
		$.ajax({
			url: model.url() + '/attendant',
			type: type,
			data: {
				name: name,
				group: model.get('group'),
				date: model.get('date')}
		}).success(function(data) {
			if (data.removed) {
				model.destroy({});
				return;
			}
			model.fetch();
		});
	}
});


/** Collection of Groups. */
ibt.Groups = Backbone.Collection.extend({
	url: '/data/groups',
	model: ibt.Group,

});


/** Main view for the app. */
ibt.AppView = Backbone.View.extend({
	// seems to be prevented by the DatePicker widget.
	events: {
		'click .selectable-date': 'dateChanged',
		'keypress #add-group input': 'newGroup'
	},

	initialize: function(args) {
		ibt.debug(['ibt.AppView.initialize; args:', args]);
		this.groupsCollection = args.groupsCollection;
		this.GroupView = args.GroupView;
		this.listenTo(this.groupsCollection, 'sync', this.render);
	},

	render: function() {
		ibt.debug('ibt.AppView.render');
		this.$('#select-a-date').hide();
		this.$('#curent-date-label').text(this.selectedDate);
		this.$('#curent-date').show();
		$("#groups-list").empty();
		this.addAllGroups();
		this.$('#groups-list').append('<div class="group-item" id="add-group">' +
			ibt.groupViewTemplate(ibt.groupDefaults) +
			'</div>');
		var that = this;
		this.$('#add-group').find('.add-user-icon').click(function() {
			that.newGroup({keyCode: 13}, that);
		});
		return this;
	},

	addGroup: function(group) {
		ibt.debug(['ibt.AppView.addGroup group:', group]);
		var view = new this.GroupView({model: group});
		this.$("#groups-list").append(view.render().el);
	},

	addAllGroups: function() {
		this.groupsCollection.each(this.addGroup, this);
	},

	newGroup: function(evt, that) {
		if (evt.keyCode != 13) {
			return;
		}
		if (!that) {
			that = this;
		}
		if (!that.selectedDate) {
			return;
		}
		var personName = $('#add-group .add-user').val();
		if (!personName) {
			$('#add-group .add-user').focus();
			return;
		}
		var groupName = $('#add-group .new-group').val();
		if (!groupName) {
			$('#add-group .new-group').focus();
			return;
		}
		var duplicatedGroup = null;
		that.groupsCollection.each(function(group) {
			if (group.get('group') == groupName) {
				duplicatedGroup = group;
				return;
			}
		});
		if (duplicatedGroup) {
			ibt.info('avoid creation of duplicated group:' + groupName);
			duplicatedGroup.addUser(personName);
			duplicatedGroup.save();
			return;
		}
		ibt.info(['create group:', groupName,
			'on date:', that.selectedDate,
			'by user:', personName]);
		var person = new ibt.Person({name: personName});
		that.groupsCollection.create({
			date: that.selectedDate,
			group: groupName,
			attendants: [person]
		});
	},

	dateChanged: function(date) {
		ibt.info('ibt.AppView.dateChanged; date:' + date);
		this.selectedDate = date;
		this.groupsCollection.fetch({data: {day: date}});
	}
});

