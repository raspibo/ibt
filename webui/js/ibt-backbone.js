/** Models, collections and views. */


/** Model of a group. */
ibt.groupDefaults = {date: '', group: '', attendants: []}
ibt.Group = Backbone.Model.extend({
	defaults: ibt.groupDefaults,
	idAttribute: '_id'
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
		$("#groups-list").empty();
		this.addAllGroups();
		this.$('#groups-list').append('<li class="group-item" id="add-group">' +
			ibt.groupViewTemplate(ibt.groupDefaults) +
			'</li>');
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

	newGroup: function(evt) {
		if (evt.keyCode != 13) {
			return;
		}
		if (!this.selectedDate) {
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
		var duplicated = false;
		this.groupsCollection.each(function(group) {
			if (group.get('group') == groupName) {
				duplicated = true;
				return;
			}
		});
		if (duplicated) {
			ibt.info('avoid creation of duplicated group:' + groupName);
			return;
		}
		ibt.info(['create group:', groupName,
			'on date:', this.selectedDate,
			'by user:', personName]);
		this.groupsCollection.create({
			date: this.selectedDate,
			group: groupName,
			attendants: [{name: personName}]
		});
	},

	dateChanged: function(date) {
		ibt.info('ibt.AppView.dateChanged; date:' + date);
		this.selectedDate = date;
		this.groupsCollection.fetch({data: {day: date}});
	}
});

