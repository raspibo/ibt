/** Models, collections and views. */


/** Model of a group. */
ibt.Group = Backbone.Model.extend({
	defaults: {group: '', attendants: []},
});


/** Collection of Groups. */
ibt.Groups = Backbone.Collection.extend({
	url: '/data/groups',
	model: ibt.Group
});


/** Main view for the app. */
ibt.AppView = Backbone.View.extend({
	// seems to be prevented by the DatePicker widget.
	events: {
		'click .selectable-date': 'dateChanged'
	},

	initialize: function(args) {
		ibt.debug('ibt.AppView.initialize');
		this.groupsContainer = args.groupsContainer;
		this.GroupView = args.GroupView;
		this.listenTo(this.groupsContainer, 'sync', this.render);
	},

	render: function() {
		ibt.debug('ibt.AppView.render');
		$("#groups-list").empty();
		this.addAllGroups();
		return this;
	},

	addGroup: function(group) {
		ibt.debug(['ibt.AppView.addGroup group:', group]);
		var view = new this.GroupView({model: group});
		this.$("#groups-list").append(view.render().el);
	},

	addAllGroups: function() {
		this.groupsContainer.each(this.addGroup, this);
	},

	dateChanged: function(date) {
		ibt.info('ibt.AppView.dateChanged; date:' + date);
		this.groupsContainer.fetch({data: {day: date}});
	}
});

