I'll be there!
==============

Ultra-simple booking webapp, developed for the RaspiBO makerspace.

Requirements
============

* MongoDB
* nodeJS
* npm (node package manager)

Installation
============

* run: **npm update**
* run: **node app.js** (or nodejs, depending on your distribution)
* connect to http://localhost:3000
* watch in awe.

Ideas for improvements
======================

* notes for user (e.g. "I have the key of the locker"), group (e.g. "today we'll build an antenna") and days (e.g. "there's a party!")
* error handling and show messages on the UI
* ajax auto-completion of group and user names
* periodic/push refresh
* admin credentials and management page (to add/remove extra dates, for example)
* fill the input fields with the real name or username of a logged in user
* edit user's preferences

TODO (technical stuff)
======================

* improve separation of MVC
* clean-up/refactory the code
* i18n
* improve documentation
* split app.js into submodules
* stop using monk
* introduce a template for the backbone AppView object
* move the GroupsView object into the ibt-backbone.js file

Author
======

Davide Alberani <da@erlug.linux.it>

License
=======

This software is released under the terms of the MIT license.

