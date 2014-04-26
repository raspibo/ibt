
/** Base namespace. */
var ibt = {};

/** log a message to the console with the given log level.
 *  If an Array is passed, each item is printed separately. */
ibt.log = function(msgs, level) {
	var msg;
	if (level === undefined) {
		level = ibt.log.LEVEL_INFO;
	}
	if (level < ibt.log.DEBUG_LEVEL || !console) {
		return;
	}
	if (!(msgs instanceof Array)) {
		msgs = [msgs];
	}
	for (var i=0; i < msgs.length; i++) {
		msg = msgs[i];
		if (level == ibt.log.LEVEL_DEBUG) {
			console.debug && console.debug(msg);
			continue;
		} else if (level == ibt.log.LEVEL_INFO) {
			console.info && console.info(msg);
			continue;
		} else if (level == ibt.log.LEVEL_WARN) {
			console.warn && console.warn(msg);
			continue;
		} else if (level == ibt.log.LEVEL_ERROR) {
			console.error && console.error(msg);
			continue;
		}
		console.log && console.log(msg);
	}
}

/* Available log levels. */
ibt.log.LEVEL_DEBUG = 0;
ibt.log.LEVEL_INFO = 1;
ibt.log.LEVEL_WARN = 2;
ibt.log.LEVEL_ERROR = 3;

ibt.log.setLevel = function(level) {
	ibt.log.DEBUG_LEVEL = level;
};

// Set the default log level.
ibt.log.setLevel(ibt.log.LEVEL_WARN);
//ibt.log.setLevel(ibt.log.LEVEL_DEBUG);

// Shortcut functions for logging.
ibt.debug = function(msg) { ibt.log(msg, ibt.log.LEVEL_DEBUG); };
ibt.info = function(msg) { ibt.log(msg, ibt.log.LEVEL_INFO); };
ibt.warn = function(msg) { ibt.log(msg, ibt.log.LEVEL_WARN); };
ibt.error = function(msg) { ibt.log(msg, ibt.log.LEVEL_ERROR); };


/** i18n function. */
ibt.translate = function(msg) {
	return (ibt.I18N && ibt.I18N[msg]) || msg;
};
// global instance.
i18n = ibt.translate;


